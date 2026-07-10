import "reflect-metadata";
import { DataSource } from "typeorm";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { ALL_ENTITIES, LedgerAccount, Transaction, Wallet } from "../entities";
import { LedgerService } from "./ledger.service";
import { assertTransition, TransactionsService } from "./transactions.service";

/**
 * Tests financiers (§42, règle 12) : écrits avant les interfaces avancées.
 * Base SQLite en mémoire — aucune donnée réelle (règle 25).
 */
describe("Registre comptable et transactions", () => {
  let dataSource: DataSource;
  let ledger: LedgerService;
  let transactions: TransactionsService;
  let walletA: Wallet;
  let walletB: Wallet;

  async function makeWallet(): Promise<Wallet> {
    const wallet = await dataSource.manager.save(
      dataSource.manager.create(Wallet, { ownerType: "user", ownerId: crypto.randomUUID() }),
    );
    await dataSource.manager.save(
      dataSource.manager.create(LedgerAccount, {
        walletId: wallet.id,
        accountType: "user_available",
      }),
    );
    return wallet;
  }

  async function balanceOf(wallet: Wallet): Promise<number> {
    const account = await ledger.getAccountForWallet(wallet.id);
    return ledger.getAccountBalance(account.id);
  }

  beforeEach(async () => {
    dataSource = new DataSource({
      type: "better-sqlite3",
      database: ":memory:",
      entities: ALL_ENTITIES,
      synchronize: true,
    });
    await dataSource.initialize();
    ledger = new LedgerService(dataSource);
    transactions = new TransactionsService(dataSource, ledger);
    walletA = await makeWallet();
    walletB = await makeWallet();
    await transactions.grant({
      receiverWalletId: walletA.id,
      amount: 300,
      reason: "seed test",
      initiatedBy: "test",
    });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it("chaque journal est équilibré et le registre global somme à zéro", async () => {
    await transactions.transfer({
      senderWalletId: walletA.id,
      receiverWalletId: walletB.id,
      amount: 120,
      initiatedBy: "test",
    });
    expect(await ledger.getGlobalImbalance()).toBe(0);
    expect(await balanceOf(walletA)).toBe(180);
    expect(await balanceOf(walletB)).toBe(120);
  });

  it("refuse une écriture non équilibrée", async () => {
    const accountA = await ledger.getAccountForWallet(walletA.id);
    const accountB = await ledger.getAccountForWallet(walletB.id);
    await expect(
      dataSource.transaction((manager) =>
        ledger.postEntry(manager, {
          reference: "TEST-DESEQ",
          transactionType: "transfer",
          description: "",
          initiatedBy: "test",
          lines: [
            { ledgerAccountId: accountA.id, direction: "debit", amount: 100 },
            { ledgerAccountId: accountB.id, direction: "credit", amount: 90 },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("aucune double dépense : le solde ne peut pas devenir négatif", async () => {
    await expect(
      transactions.transfer({
        senderWalletId: walletA.id,
        receiverWalletId: walletB.id,
        amount: 301,
        initiatedBy: "test",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await balanceOf(walletA)).toBe(300);
    expect(await balanceOf(walletB)).toBe(0);
  });

  it("une requête répétée avec la même clé d'idempotence ne crée pas deux transactions", async () => {
    const input = {
      senderWalletId: walletA.id,
      receiverWalletId: walletB.id,
      amount: 50,
      idempotencyKey: "idem-test-1",
      initiatedBy: "test",
    };
    const first = await transactions.transfer(input);
    const second = await transactions.transfer(input);
    expect(second.id).toBe(first.id);
    expect(await balanceOf(walletA)).toBe(250);
    expect(await balanceOf(walletB)).toBe(50);
    const count = await dataSource.manager.countBy(Transaction, {
      idempotencyKey: "idem-test-1",
    });
    expect(count).toBe(1);
  });

  it("une transaction échouée ne modifie pas les soldes", async () => {
    await expect(
      transactions.transfer({
        senderWalletId: walletA.id,
        receiverWalletId: walletB.id,
        amount: 10_000,
        initiatedBy: "test",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await balanceOf(walletA)).toBe(300);
    expect(await ledger.getGlobalImbalance()).toBe(0);
  });

  it("une contrepassation crée de nouvelles écritures et restaure les soldes", async () => {
    const tx = await transactions.transfer({
      senderWalletId: walletA.id,
      receiverWalletId: walletB.id,
      amount: 100,
      initiatedBy: "test",
    });
    const reversal = await transactions.reverse(tx.id, "admin-test");
    expect(reversal.type).toBe("reversal");
    expect(reversal.reversalOfId).toBe(tx.id);
    expect(await balanceOf(walletA)).toBe(300);
    expect(await balanceOf(walletB)).toBe(0);
    expect(await ledger.getGlobalImbalance()).toBe(0);

    const original = await dataSource.manager.findOneByOrFail(Transaction, { id: tx.id });
    expect(original.status).toBe("REVERSED");
    // Une transaction déjà contrepassée ne peut pas l'être une seconde fois.
    await expect(transactions.reverse(tx.id, "admin-test")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("la machine à états interdit les transitions non autorisées (§33)", () => {
    expect(() => assertTransition("CREATED", "PENDING")).not.toThrow();
    expect(() => assertTransition("PENDING", "COMPLETED")).not.toThrow();
    expect(() => assertTransition("COMPLETED", "REVERSED")).not.toThrow();
    expect(() => assertTransition("COMPLETED", "PENDING")).toThrow(ConflictException);
    expect(() => assertTransition("REVERSED", "COMPLETED")).toThrow(ConflictException);
    expect(() => assertTransition("FAILED", "COMPLETED")).toThrow(ConflictException);
  });

  it("les soldes restent cohérents sous transferts concurrents", async () => {
    const attempts = Array.from({ length: 8 }, (_, index) =>
      transactions
        .transfer({
          senderWalletId: walletA.id,
          receiverWalletId: walletB.id,
          amount: 60,
          initiatedBy: "test",
          idempotencyKey: `concurrent-${index}`,
        })
        .then(() => true)
        .catch(() => false),
    );
    const results = await Promise.all(attempts);
    const succeeded = results.filter(Boolean).length;
    // 300 Boyia disponibles → au plus 5 transferts de 60 peuvent réussir.
    expect(succeeded).toBeLessThanOrEqual(5);
    expect(await balanceOf(walletA)).toBe(300 - succeeded * 60);
    expect(await balanceOf(walletB)).toBe(succeeded * 60);
    expect(await ledger.getGlobalImbalance()).toBe(0);
  });

  it("applique la limite par transfert", async () => {
    await expect(
      transactions.transfer({
        senderWalletId: walletA.id,
        receiverWalletId: walletB.id,
        amount: 501,
        initiatedBy: "test",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
