import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { randomBytes, randomInt } from "node:crypto";
import { LedgerAccount, OtpCode, RewardRule, User, Wallet } from "../entities";
import { TransactionsService } from "../ledger/transactions.service";
import { config } from "../config";

export interface JwtPayload {
  sub: string;
  role: string;
  type: "access" | "refresh";
}

export interface RegisterInput {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  pin: string;
  country?: string;
  preferredLanguage?: string;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, "");
}

function makeUsername(firstName: string, lastName: string): string {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z.]/g, "");
  return `@${base}.${randomBytes(2).toString("hex")}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly transactions: TransactionsService,
  ) {}

  /** Inscription par téléphone (§9.1) : crée le compte en attente + envoie un OTP. */
  async register(input: RegisterInput): Promise<{ publicId: string; demoOtp?: string }> {
    const phoneNumber = normalizePhone(input.phoneNumber);
    if (!/^\+?\d{8,15}$/.test(phoneNumber)) {
      throw new BadRequestException("Numéro de téléphone invalide.");
    }
    if (!/^\d{4,6}$/.test(input.pin)) {
      throw new BadRequestException("Le code PIN doit contenir 4 à 6 chiffres.");
    }

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(User, { phoneNumber });
      if (existing) throw new ConflictException("Ce numéro est déjà enregistré.");

      const user = await manager.save(
        manager.create(User, {
          publicId: `usr_${randomBytes(8).toString("hex")}`,
          phoneNumber,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          username: makeUsername(input.firstName, input.lastName),
          country: input.country ?? "CI",
          preferredLanguage: input.preferredLanguage ?? "fr",
          role: "user",
          status: "pending",
          verificationLevel: 0,
          pinHash: await argon2.hash(input.pin, { type: argon2.argon2id }),
        }),
      );

      // Portefeuille + compte comptable créés dès l'inscription (§52).
      const wallet = await manager.save(
        manager.create(Wallet, { ownerType: "user", ownerId: user.id }),
      );
      await manager.save(
        manager.create(LedgerAccount, { walletId: wallet.id, accountType: "user_available" }),
      );

      const otp = await this.issueOtp(phoneNumber);
      return {
        publicId: user.publicId,
        // En production l'OTP part par SMS ; en démo il est renvoyé dans la réponse.
        ...(config.isProduction ? {} : { demoOtp: otp }),
      };
    });
  }

  /** Vérification OTP (§9.1) : active le compte, passe au niveau 1. */
  async verifyOtp(phone: string, code: string) {
    const phoneNumber = normalizePhone(phone);
    const otp = await this.dataSource.manager.findOne(OtpCode, {
      where: { phoneNumber, consumed: 0 },
      order: { expiresAt: "DESC" },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Code expiré. Demande un nouveau code.");
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException("Trop de tentatives. Demande un nouveau code.");
    }
    if (otp.code !== code) {
      otp.attempts += 1;
      await this.dataSource.manager.save(otp);
      throw new UnauthorizedException("Code incorrect.");
    }
    otp.consumed = 1;
    await this.dataSource.manager.save(otp);

    const user = await this.dataSource.manager.findOneBy(User, { phoneNumber });
    if (!user) throw new UnauthorizedException("Compte introuvable.");
    if (user.status === "pending") {
      user.status = "active";
      user.verificationLevel = Math.max(user.verificationLevel, 1);
      await this.dataSource.manager.save(user);
      await this.applySignupReward(user);
    }
    return this.buildTokens(user);
  }

  /** Moteur de règles (§16) : récompense « inscription complétée » si active et budgétée. */
  private async applySignupReward(user: User): Promise<void> {
    const rule = await this.dataSource.manager.findOneBy(RewardRule, {
      trigger: "signup.completed",
      status: "active",
    });
    if (!rule) return;
    if (rule.budget > 0 && rule.spentAmount + rule.rewardAmount > rule.budget) return;
    const wallet = await this.dataSource.manager.findOneBy(Wallet, {
      ownerType: "user",
      ownerId: user.id,
    });
    if (!wallet) return;
    await this.transactions.grant({
      receiverWalletId: wallet.id,
      amount: rule.rewardAmount,
      reason: rule.name,
      initiatedBy: `rule:${rule.trigger}`,
      type: "reward",
    });
    rule.spentAmount += rule.rewardAmount;
    await this.dataSource.manager.save(rule);
  }

  /** Connexion utilisateur : téléphone + PIN. */
  async login(phone: string, pin: string) {
    const user = await this.dataSource.manager.findOneBy(User, {
      phoneNumber: normalizePhone(phone),
    });
    if (!user || !user.pinHash || !(await argon2.verify(user.pinHash, pin))) {
      // Message générique — ne pas révéler si le compte existe (§35).
      throw new UnauthorizedException("Identifiants incorrects.");
    }
    this.assertActive(user);
    return this.buildTokens(user);
  }

  /** Connexion administrateur : e-mail + mot de passe (§9.2). */
  async adminLogin(email: string, password: string) {
    const user = await this.dataSource.manager.findOneBy(User, {
      email: email.toLowerCase().trim(),
    });
    if (
      !user ||
      user.role !== "admin" ||
      !user.passwordHash ||
      !(await argon2.verify(user.passwordHash, password))
    ) {
      throw new UnauthorizedException("Identifiants incorrects.");
    }
    this.assertActive(user);
    return this.buildTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException("Jeton invalide.");
    }
    if (payload.type !== "refresh") throw new UnauthorizedException("Jeton invalide.");
    const user = await this.dataSource.manager.findOneBy(User, { id: payload.sub });
    if (!user) throw new UnauthorizedException("Compte introuvable.");
    this.assertActive(user);
    return this.buildTokens(user);
  }

  private assertActive(user: User): void {
    if (user.status !== "active") {
      throw new UnauthorizedException("Compte inactif ou suspendu.");
    }
  }

  private async issueOtp(phoneNumber: string): Promise<string> {
    const code = config.isProduction
      ? String(randomInt(100000, 999999))
      : config.demoOtp;
    await this.dataSource.manager.save(
      this.dataSource.manager.create(OtpCode, {
        phoneNumber,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      }),
    );
    return code;
  }

  private async buildTokens(user: User) {
    const base = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(
        { ...base, type: "access" },
        { expiresIn: config.accessTokenTtl },
      ),
      refreshToken: await this.jwt.signAsync(
        { ...base, type: "refresh" },
        { expiresIn: config.refreshTokenTtl },
      ),
      user: {
        publicId: user.publicId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        verificationLevel: user.verificationLevel,
      },
    };
  }
}
