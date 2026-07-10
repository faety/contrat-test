import type { INestApplicationContext } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { LedgerAccount, RewardRule, User, Wallet } from "./entities";
import { TransactionsService } from "./ledger/transactions.service";

/**
 * Données de démonstration entièrement fictives (§53, règles 24-25).
 * Tous les soldes sont créés via de vraies opérations du registre : le
 * grand livre reste équilibré par construction.
 */
export async function seedIfEmpty(app: INestApplicationContext): Promise<void> {
  const dataSource = app.get(DataSource);
  const transactions = app.get(TransactionsService);

  const userCount = await dataSource.manager.count(User);
  if (userCount > 0) return;

  const manager = dataSource.manager;

  async function createUser(input: {
    firstName: string;
    lastName: string;
    username: string;
    phoneNumber: string;
    role?: User["role"];
    email?: string;
    password?: string;
    verificationLevel?: number;
  }): Promise<{ user: User; wallet: Wallet }> {
    const user = await manager.save(
      manager.create(User, {
        publicId: `usr_${randomBytes(8).toString("hex")}`,
        phoneNumber: input.phoneNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email ?? null,
        role: input.role ?? "user",
        status: "active",
        verificationLevel: input.verificationLevel ?? 1,
        pinHash: await argon2.hash("1234", { type: argon2.argon2id }),
        passwordHash: input.password
          ? await argon2.hash(input.password, { type: argon2.argon2id })
          : null,
      }),
    );
    const wallet = await manager.save(
      manager.create(Wallet, { ownerType: "user", ownerId: user.id }),
    );
    await manager.save(
      manager.create(LedgerAccount, { walletId: wallet.id, accountType: "user_available" }),
    );
    return { user, wallet };
  }

  // Administrateur (identifiants de démo — à changer en production).
  const admin = await createUser({
    firstName: "Admin",
    lastName: "Boyia",
    username: "@admin.boyia",
    phoneNumber: "+2250100000000",
    role: "admin",
    email: "admin@boyia.ci",
    password: "Boyia!Admin2026",
    verificationLevel: 3,
  });

  const awa = await createUser({
    firstName: "Awa",
    lastName: "Kouassi",
    username: "@awa.kouassi",
    phoneNumber: "+2250700000042",
  });
  const christ = await createUser({
    firstName: "Christ",
    lastName: "Aaron",
    username: "@christ.aaron",
    phoneNumber: "+2250500000018",
    verificationLevel: 2,
  });
  const michele = await createUser({
    firstName: "Michèle",
    lastName: "Koffi",
    username: "@michele.koffi",
    phoneNumber: "+2250100000077",
  });
  const market = await createUser({
    firstName: "Boyia",
    lastName: "Market",
    username: "@boyia.market",
    phoneNumber: "+2252700000245",
    role: "merchant",
    verificationLevel: 3,
  });

  const grant = (walletId: string, amount: number, reason: string) =>
    transactions.grant({
      receiverWalletId: walletId,
      amount,
      reason,
      initiatedBy: admin.user.id,
      type: "reward",
    });

  // Émissions initiales (soldes §53 construits par le registre).
  await grant(awa.wallet.id, 20, "Inscription complétée");
  await grant(awa.wallet.id, 50, "Formation — Bases de l'entrepreneuriat");
  await grant(awa.wallet.id, 25, "Parrainage validé — Mariam T.");
  await grant(awa.wallet.id, 1_155, "Récompenses cumulées Boyia Business Club");
  await grant(christ.wallet.id, 2_400, "Ventes de produits créatifs — badge Jeune entrepreneur");
  await grant(michele.wallet.id, 300, "Programme parents partenaires");
  await grant(market.wallet.id, 500, "Fonds de campagne Cashback rentrée scolaire");

  // Quelques mouvements réels entre comptes.
  await transactions.transfer({
    senderWalletId: christ.wallet.id,
    receiverWalletId: awa.wallet.id,
    amount: 200,
    note: "Merci pour le coup de main !",
    initiatedBy: christ.user.id,
  });
  await transactions.transfer({
    senderWalletId: awa.wallet.id,
    receiverWalletId: market.wallet.id,
    amount: 180,
    note: "Fournitures scolaires",
    initiatedBy: awa.user.id,
    type: "payment",
  });

  // Règles de récompense (§16.1).
  const rules: Array<Partial<RewardRule>> = [
    {
      name: "Inscription complétée",
      trigger: "signup.completed",
      rewardAmount: 20,
      budget: 100_000,
      description: "Attribuée après vérification du téléphone.",
    },
    {
      name: "Première formation terminée",
      trigger: "course.first_completed",
      rewardAmount: 50,
      budget: 250_000,
      description: "Formation complétée à 100 % avec quiz réussi.",
    },
    {
      name: "Invitation validée",
      trigger: "referral.validated",
      rewardAmount: 25,
      budget: 150_000,
      description: "Le filleul a vérifié son téléphone et terminé son profil.",
    },
    {
      name: "Quiz réussi à 80 %",
      trigger: "quiz.passed_80",
      rewardAmount: 15,
      budget: 80_000,
      description: "Score minimal de 80 % à un quiz de formation.",
    },
    {
      name: "Cinq jours consécutifs d'activité",
      trigger: "streak.5_days",
      rewardAmount: 10,
      budget: 60_000,
      description: "Série quotidienne de cinq jours.",
    },
  ];
  for (const rule of rules) {
    await manager.save(manager.create(RewardRule, { ...rule, status: "active" }));
  }

  // eslint-disable-next-line no-console
  console.log(
    "Base de démonstration initialisée (admin : admin@boyia.ci / Boyia!Admin2026 — fictif).",
  );
}
