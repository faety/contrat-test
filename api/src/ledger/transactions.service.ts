import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { randomBytes } from "node:crypto";
import { Transaction, TransactionStatus, Wallet } from "../entities";
import { LedgerService } from "./ledger.service";
import { config } from "../config";

/** Transitions autorisées de la machine à états (§33). */
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  CREATED: ["PENDING", "CANCELLED", "FAILED"],
  PENDING: ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED", "UNDER_REVIEW"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: ["REVERSED", "UNDER_REVIEW"],
  UNDER_REVIEW: ["COMPLETED", "REVERSED", "BLOCKED"],
  BLOCKED: ["UNDER_REVIEW", "CANCELLED"],
  FAILED: [],
  CANCELLED: [],
  REVERSED: [],
};

export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException(`Transition interdite : ${from} → ${to}.`);
  }
}

export function makeReference(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return `BY-${ymd}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export interface TransferInput {
  senderWalletId: string;
  receiverWalletId: string;
  amount: number;
  note?: string;
  idempotencyKey?: string;
  initiatedBy: string;
  type?: "transfer" | "payment";
}

export interface GrantInput {
  receiverWalletId: string;
  amount: number;
  reason: string;
  initiatedBy: string;
  type?: "reward" | "admin_grant";
}

@Injectable()
export class TransactionsService {
  /**
   * Verrouillage transactionnel (§35.4) : les opérations financières sont
   * sérialisées dans ce processus. Avec PostgreSQL en production, le
   * remplacer par un verrou pessimiste (SELECT … FOR UPDATE) par compte.
   */
  private lockQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.lockQueue.then(operation, operation);
    this.lockQueue = result.catch(() => undefined);
    return result;
  }

  /**
   * Transfert entre portefeuilles. Toute l'opération (vérification du solde,
   * écriture comptable, transaction) est atomique. La clé d'idempotence
   * garantit qu'une requête répétée ne crée pas de double transaction.
   */
  async transfer(input: TransferInput): Promise<Transaction> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new BadRequestException("Montant invalide.");
    }
    if (input.senderWalletId === input.receiverWalletId) {
      throw new BadRequestException("Impossible de transférer vers soi-même.");
    }
    if (input.amount > config.transferLimitPerTx) {
      throw new BadRequestException(
        `Montant supérieur à la limite par transfert (${config.transferLimitPerTx} Boyia).`,
      );
    }

    return this.runExclusive(() => this.dataSource.transaction(async (manager) => {
      if (input.idempotencyKey) {
        const existing = await manager.findOneBy(Transaction, {
          idempotencyKey: input.idempotencyKey,
        });
        if (existing) return existing;
      }

      const sender = await manager.findOneBy(Wallet, { id: input.senderWalletId });
      const receiver = await manager.findOneBy(Wallet, { id: input.receiverWalletId });
      if (!sender || !receiver) throw new NotFoundException("Portefeuille introuvable.");
      if (sender.status !== "active" || receiver.status !== "active") {
        throw new BadRequestException("Portefeuille inactif.");
      }

      const senderAccount = await this.ledger.getAccountForWallet(sender.id, manager);
      const receiverAccount = await this.ledger.getAccountForWallet(receiver.id, manager);

      // Confirmation du solde côté serveur (§35.4) — jamais confiance au client.
      const balance = await this.ledger.getAccountBalance(senderAccount.id, manager);
      if (balance < input.amount) {
        throw new BadRequestException("Solde disponible insuffisant.");
      }

      const dailySpent = await this.getDailyOutflow(manager, sender.id);
      if (dailySpent + input.amount > config.transferDailyLimit) {
        throw new BadRequestException(
          `Limite quotidienne dépassée (${config.transferDailyLimit} Boyia).`,
        );
      }

      let tx = manager.create(Transaction, {
        publicReference: makeReference(),
        senderWalletId: sender.id,
        receiverWalletId: receiver.id,
        amount: input.amount,
        fee: 0,
        status: "CREATED",
        type: input.type ?? "transfer",
        idempotencyKey: input.idempotencyKey ?? null,
        note: input.note ?? null,
      });
      tx = await manager.save(tx);

      assertTransition(tx.status, "PENDING");
      tx.status = "PENDING";

      const entry = await this.ledger.postEntry(manager, {
        reference: tx.publicReference,
        transactionType: tx.type,
        description: input.note ?? "",
        initiatedBy: input.initiatedBy,
        lines: [
          { ledgerAccountId: senderAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: receiverAccount.id, direction: "credit", amount: input.amount },
        ],
      });

      assertTransition(tx.status, "COMPLETED");
      tx.status = "COMPLETED";
      tx.journalEntryId = entry.id;
      tx.completedAt = new Date();
      return manager.save(tx);
    }));
  }

  /** Émission de Boyia (récompense ou attribution admin) : débit du compte système d'émission. */
  async grant(input: GrantInput): Promise<Transaction> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new BadRequestException("Montant invalide.");
    }
    return this.runExclusive(() => this.dataSource.transaction(async (manager) => {
      const receiver = await manager.findOneBy(Wallet, { id: input.receiverWalletId });
      if (!receiver) throw new NotFoundException("Portefeuille introuvable.");
      if (receiver.status !== "active") throw new BadRequestException("Portefeuille inactif.");

      const emission = await this.ledger.getOrCreateSystemAccount("system_emission", manager);
      const receiverAccount = await this.ledger.getAccountForWallet(receiver.id, manager);

      let tx = manager.create(Transaction, {
        publicReference: makeReference(),
        senderWalletId: null,
        receiverWalletId: receiver.id,
        amount: input.amount,
        fee: 0,
        status: "CREATED",
        type: input.type ?? "admin_grant",
        note: input.reason,
      });
      tx = await manager.save(tx);

      assertTransition(tx.status, "PENDING");
      tx.status = "PENDING";

      const entry = await this.ledger.postEntry(manager, {
        reference: tx.publicReference,
        transactionType: tx.type,
        description: input.reason,
        initiatedBy: input.initiatedBy,
        lines: [
          { ledgerAccountId: emission.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: receiverAccount.id, direction: "credit", amount: input.amount },
        ],
      });

      assertTransition(tx.status, "COMPLETED");
      tx.status = "COMPLETED";
      tx.journalEntryId = entry.id;
      tx.completedAt = new Date();
      return manager.save(tx);
    }));
  }

  /** Contrepassation d'une transaction confirmée (§7, §25.3). */
  async reverse(transactionId: string, initiatedBy: string): Promise<Transaction> {
    return this.runExclusive(() => this.dataSource.transaction(async (manager) => {
      const original = await manager.findOneBy(Transaction, { id: transactionId });
      if (!original) throw new NotFoundException("Transaction introuvable.");
      assertTransition(original.status, "REVERSED");
      if (!original.journalEntryId) {
        throw new BadRequestException("Transaction sans écriture comptable.");
      }

      const reversalRef = makeReference();
      const entry = await this.ledger.reverseEntry(
        manager,
        original.journalEntryId,
        initiatedBy,
        reversalRef,
      );

      const reversal = await manager.save(
        manager.create(Transaction, {
          publicReference: reversalRef,
          senderWalletId: original.receiverWalletId,
          receiverWalletId: original.senderWalletId,
          amount: original.amount,
          fee: 0,
          status: "COMPLETED",
          type: "reversal",
          note: `Contrepassation de ${original.publicReference}`,
          journalEntryId: entry.id,
          reversalOfId: original.id,
          completedAt: new Date(),
        }),
      );

      original.status = "REVERSED";
      await manager.save(original);
      return reversal;
    }));
  }

  private async getDailyOutflow(manager: EntityManager, walletId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const row: { total: string | number | null } | undefined = await manager
      .createQueryBuilder(Transaction, "tx")
      .select("COALESCE(SUM(tx.amount), 0)", "total")
      .where("tx.senderWalletId = :walletId", { walletId })
      .andWhere("tx.status = 'COMPLETED'")
      .andWhere("tx.createdAt >= :startOfDay", { startOfDay })
      .getRawOne();
    return Number(row?.total ?? 0);
  }
}
