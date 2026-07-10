import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, ILike } from "typeorm";
import {
  RewardRule,
  Transaction,
  User,
  UserStatus,
  Wallet,
} from "../entities";
import { LedgerService } from "../ledger/ledger.service";
import { TransactionsService } from "../ledger/transactions.service";
import { AuditService } from "../audit/audit.service";
import { config } from "../config";

interface Actor {
  id: string;
  role: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly transactions: TransactionsService,
    private readonly audit: AuditService,
  ) {}

  /** Tableau de bord global (§25.1). */
  async dashboard() {
    const manager = this.dataSource.manager;
    const [totalUsers, activeUsers, verifiedUsers, blockedUsers] = await Promise.all([
      manager.count(User),
      manager.countBy(User, { status: "active" }),
      manager
        .createQueryBuilder(User, "u")
        .where("u.verificationLevel >= 1")
        .getCount(),
      manager.countBy(User, { status: "blocked" }),
    ]);

    const txStats: { count: string | number; volume: string | number | null } | undefined =
      await manager
        .createQueryBuilder(Transaction, "tx")
        .select("COUNT(*)", "count")
        .addSelect("COALESCE(SUM(tx.amount), 0)", "volume")
        .where("tx.status = 'COMPLETED'")
        .getRawOne();

    const emission = await this.ledger.getOrCreateSystemAccount("system_emission");
    // Le compte d'émission porte un solde débiteur : son opposé = Boyia en circulation.
    const emitted = -(await this.ledger.getAccountBalance(emission.id));
    const imbalance = await this.ledger.getGlobalImbalance();

    const recent = await manager.find(Transaction, {
      order: { createdAt: "DESC" },
      take: 8,
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        blocked: blockedUsers,
      },
      boyia: {
        emitted,
        inCirculation: emitted,
        fcfaPerBoyia: config.fcfaPerBoyia,
        ledgerImbalance: imbalance,
        ledgerBalanced: imbalance === 0,
      },
      transactions: {
        completed: Number(txStats?.count ?? 0),
        volume: Number(txStats?.volume ?? 0),
        recent: recent.map((tx) => this.txToAdmin(tx)),
      },
      featureFlags: config.featureFlags,
    };
  }

  /** Gestion des utilisateurs (§25.2). */
  async listUsers(search?: string, limit = 50) {
    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { phoneNumber: ILike(`%${search}%`) },
          { username: ILike(`%${search}%`) },
        ]
      : undefined;
    const users = await this.dataSource.manager.find(User, {
      where,
      order: { createdAt: "DESC" },
      take: Math.min(limit, 100),
    });
    return Promise.all(users.map((user) => this.userToAdmin(user)));
  }

  async setUserStatus(actor: Actor, publicId: string, status: UserStatus, ip?: string) {
    const user = await this.dataSource.manager.findOneBy(User, { publicId });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    if (user.role === "admin") {
      throw new BadRequestException("Le statut d'un administrateur se gère séparément.");
    }
    const previous = user.status;
    user.status = status;
    await this.dataSource.manager.save(user);
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: "user.status.change",
      entityType: "user",
      entityId: user.publicId,
      details: { from: previous, to: status },
      ipAddress: ip,
    });
    return this.userToAdmin(user);
  }

  /** Attribution administrative de Boyia (§47) — émission tracée et auditée. */
  async grantBoyia(actor: Actor, publicId: string, amount: number, reason: string, ip?: string) {
    const user = await this.dataSource.manager.findOneBy(User, { publicId });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    const wallet = await this.dataSource.manager.findOneBy(Wallet, {
      ownerType: "user",
      ownerId: user.id,
    });
    if (!wallet) throw new NotFoundException("Portefeuille introuvable.");

    const tx = await this.transactions.grant({
      receiverWalletId: wallet.id,
      amount,
      reason,
      initiatedBy: actor.id,
      type: "admin_grant",
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: "boyia.grant",
      entityType: "transaction",
      entityId: tx.publicReference,
      details: { user: user.publicId, amount, reason },
      ipAddress: ip,
    });
    return this.txToAdmin(tx);
  }

  /** Gestion des transactions (§25.3). */
  async listTransactions(limit = 50) {
    const rows = await this.dataSource.manager.find(Transaction, {
      order: { createdAt: "DESC" },
      take: Math.min(limit, 200),
    });
    return rows.map((tx) => this.txToAdmin(tx));
  }

  async reverseTransaction(actor: Actor, id: string, reason: string, ip?: string) {
    const reversal = await this.transactions.reverse(id, actor.id);
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: "transaction.reverse",
      entityType: "transaction",
      entityId: reversal.publicReference,
      details: { reversalOf: id, reason },
      ipAddress: ip,
    });
    return this.txToAdmin(reversal);
  }

  /** Règles de récompense (§16) — créées sans modifier le code. */
  async listRewardRules() {
    return this.dataSource.manager.find(RewardRule, { order: { createdAt: "DESC" } });
  }

  async createRewardRule(
    actor: Actor,
    input: { name: string; description?: string; trigger: string; rewardAmount: number; budget?: number },
    ip?: string,
  ) {
    const rule = await this.dataSource.manager.save(
      this.dataSource.manager.create(RewardRule, {
        name: input.name,
        description: input.description ?? "",
        trigger: input.trigger,
        rewardAmount: input.rewardAmount,
        budget: input.budget ?? 0,
        status: "active",
      }),
    );
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: "reward-rule.create",
      entityType: "reward_rule",
      entityId: rule.id,
      details: { name: rule.name, trigger: rule.trigger, rewardAmount: rule.rewardAmount },
      ipAddress: ip,
    });
    return rule;
  }

  async setRewardRuleStatus(
    actor: Actor,
    id: string,
    status: "active" | "paused" | "ended",
    ip?: string,
  ) {
    const rule = await this.dataSource.manager.findOneBy(RewardRule, { id });
    if (!rule) throw new NotFoundException("Règle introuvable.");
    const previous = rule.status;
    rule.status = status;
    await this.dataSource.manager.save(rule);
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: "reward-rule.status.change",
      entityType: "reward_rule",
      entityId: rule.id,
      details: { from: previous, to: status },
      ipAddress: ip,
    });
    return rule;
  }

  async auditLogs(limit = 100) {
    return this.audit.list(limit);
  }

  private async userToAdmin(user: User) {
    const wallet = await this.dataSource.manager.findOneBy(Wallet, {
      ownerType: "user",
      ownerId: user.id,
    });
    let balance = 0;
    if (wallet) {
      const account = await this.ledger.getAccountForWallet(wallet.id);
      balance = await this.ledger.getAccountBalance(account.id);
    }
    return {
      publicId: user.publicId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      status: user.status,
      verificationLevel: user.verificationLevel,
      balance,
      createdAt: user.createdAt,
    };
  }

  private txToAdmin(tx: Transaction) {
    return {
      id: tx.id,
      reference: tx.publicReference,
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      fee: tx.fee,
      note: tx.note,
      senderWalletId: tx.senderWalletId,
      receiverWalletId: tx.receiverWalletId,
      reversalOfId: tx.reversalOfId,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    };
  }
}
