import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource, EntityManager, IsNull } from "typeorm";
import {
  JournalEntry,
  LedgerAccount,
  LedgerAccountType,
  LedgerLine,
} from "../entities";

export interface LedgerLineInput {
  ledgerAccountId: string;
  direction: "debit" | "credit";
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface PostEntryInput {
  reference: string;
  transactionType: string;
  description: string;
  initiatedBy: string;
  lines: LedgerLineInput[];
}

/**
 * Registre comptable à double entrée (§7).
 *
 * Aucun solde n'est stocké comme source de vérité : il est calculé à partir
 * des écritures. Une écriture confirmée n'est jamais modifiée ni supprimée ;
 * toute correction passe par une contrepassation (écriture inverse).
 */
@Injectable()
export class LedgerService {
  constructor(private readonly dataSource: DataSource) {}

  /** Valide et enregistre une écriture équilibrée. À appeler dans une transaction DB. */
  async postEntry(manager: EntityManager, input: PostEntryInput): Promise<JournalEntry> {
    if (input.lines.length < 2) {
      throw new BadRequestException("Une écriture requiert au moins deux lignes.");
    }
    let debits = 0;
    let credits = 0;
    for (const line of input.lines) {
      if (!Number.isInteger(line.amount) || line.amount <= 0) {
        throw new BadRequestException("Montant de ligne invalide.");
      }
      if (line.direction === "debit") debits += line.amount;
      else credits += line.amount;
    }
    if (debits !== credits) {
      throw new BadRequestException("Écriture non équilibrée : débits ≠ crédits.");
    }

    const entry = await manager.save(
      manager.create(JournalEntry, {
        reference: input.reference,
        transactionType: input.transactionType,
        description: input.description,
        initiatedBy: input.initiatedBy,
        status: "posted",
      }),
    );
    for (const line of input.lines) {
      await manager.save(
        manager.create(LedgerLine, {
          journalEntryId: entry.id,
          ledgerAccountId: line.ledgerAccountId,
          direction: line.direction,
          amount: line.amount,
          metadata: line.metadata ?? null,
        }),
      );
    }
    return entry;
  }

  /** Contrepassation : nouvelle écriture aux lignes inversées (jamais de suppression). */
  async reverseEntry(
    manager: EntityManager,
    originalEntryId: string,
    initiatedBy: string,
    reference: string,
  ): Promise<JournalEntry> {
    const original = await manager.findOneByOrFail(JournalEntry, { id: originalEntryId });
    if (original.status === "reversed") {
      throw new BadRequestException("Écriture déjà contrepassée.");
    }
    const lines = await manager.findBy(LedgerLine, { journalEntryId: originalEntryId });
    const entry = await this.postEntry(manager, {
      reference,
      transactionType: "reversal",
      description: `Contrepassation de ${original.reference}`,
      initiatedBy,
      lines: lines.map((line) => ({
        ledgerAccountId: line.ledgerAccountId,
        direction: line.direction === "debit" ? "credit" : "debit",
        amount: line.amount,
        metadata: { reversalOf: original.id },
      })),
    });
    original.status = "reversed";
    await manager.save(original);
    return entry;
  }

  /** Solde d'un compte = crédits − débits, calculé depuis le registre. */
  async getAccountBalance(accountId: string, manager?: EntityManager): Promise<number> {
    const em = manager ?? this.dataSource.manager;
    const row: { balance: string | number | null } | undefined = await em
      .createQueryBuilder(LedgerLine, "line")
      .select(
        "COALESCE(SUM(CASE WHEN line.direction = 'credit' THEN line.amount ELSE -line.amount END), 0)",
        "balance",
      )
      .where("line.ledgerAccountId = :accountId", { accountId })
      .getRawOne();
    return Number(row?.balance ?? 0);
  }

  /** Somme globale du registre — doit toujours valoir zéro. */
  async getGlobalImbalance(manager?: EntityManager): Promise<number> {
    const em = manager ?? this.dataSource.manager;
    const row: { total: string | number | null } | undefined = await em
      .createQueryBuilder(LedgerLine, "line")
      .select(
        "COALESCE(SUM(CASE WHEN line.direction = 'credit' THEN line.amount ELSE -line.amount END), 0)",
        "total",
      )
      .getRawOne();
    return Number(row?.total ?? 0);
  }

  async getOrCreateSystemAccount(
    accountType: Extract<LedgerAccountType, "system_emission" | "system_fees">,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    const em = manager ?? this.dataSource.manager;
    const existing = await em.findOneBy(LedgerAccount, { accountType, walletId: IsNull() });
    if (existing) return existing;
    return em.save(em.create(LedgerAccount, { accountType, walletId: null }));
  }

  async getAccountForWallet(walletId: string, manager?: EntityManager): Promise<LedgerAccount> {
    const em = manager ?? this.dataSource.manager;
    return em.findOneByOrFail(LedgerAccount, { walletId, accountType: "user_available" });
  }
}
