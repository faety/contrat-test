import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Transaction, User, Wallet } from "../entities";
import { LedgerService } from "../ledger/ledger.service";
import { TransactionsService } from "../ledger/transactions.service";
import { config } from "../config";

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly transactions: TransactionsService,
  ) {}

  async getWalletForUser(userId: string): Promise<Wallet> {
    const wallet = await this.dataSource.manager.findOneBy(Wallet, {
      ownerType: "user",
      ownerId: userId,
    });
    if (!wallet) throw new NotFoundException("Portefeuille introuvable.");
    return wallet;
  }

  /** Solde calculé depuis le registre — jamais stocké comme source de vérité (règle 8). */
  async getBalances(userId: string) {
    const wallet = await this.getWalletForUser(userId);
    const account = await this.ledger.getAccountForWallet(wallet.id);
    const available = await this.ledger.getAccountBalance(account.id);
    return {
      walletId: wallet.id,
      currencyCode: wallet.currencyCode,
      available,
      indicativeFcfa: available * config.fcfaPerBoyia,
      limits: {
        perTransfer: config.transferLimitPerTx,
        daily: config.transferDailyLimit,
      },
    };
  }

  async getTransactions(userId: string, limit = 50) {
    const wallet = await this.getWalletForUser(userId);
    const rows = await this.dataSource.manager
      .createQueryBuilder(Transaction, "tx")
      .where("tx.senderWalletId = :id OR tx.receiverWalletId = :id", { id: wallet.id })
      .orderBy("tx.createdAt", "DESC")
      .take(Math.min(limit, 100))
      .getMany();
    return rows.map((tx) => this.toPublic(tx, wallet.id));
  }

  /** Transfert vers un autre utilisateur identifié par téléphone ou nom d'utilisateur (§14.1). */
  async transferByIdentifier(input: {
    senderUserId: string;
    recipient: string;
    amount: number;
    note?: string;
    idempotencyKey?: string;
  }) {
    const senderWallet = await this.getWalletForUser(input.senderUserId);
    const recipientUser = await this.findRecipient(input.recipient);
    if (!recipientUser) throw new NotFoundException("Destinataire introuvable.");
    if (recipientUser.id === input.senderUserId) {
      throw new BadRequestException("Impossible de transférer vers soi-même.");
    }
    const receiverWallet = await this.getWalletForUser(recipientUser.id);
    const tx = await this.transactions.transfer({
      senderWalletId: senderWallet.id,
      receiverWalletId: receiverWallet.id,
      amount: input.amount,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
      initiatedBy: input.senderUserId,
    });
    return {
      ...this.toPublic(tx, senderWallet.id),
      recipient: {
        firstName: recipientUser.firstName,
        lastName: recipientUser.lastName,
        username: recipientUser.username,
      },
    };
  }

  private async findRecipient(identifier: string): Promise<User | null> {
    const trimmed = identifier.trim();
    if (trimmed.startsWith("@")) {
      return this.dataSource.manager.findOneBy(User, { username: trimmed });
    }
    return this.dataSource.manager.findOneBy(User, {
      phoneNumber: trimmed.replace(/[\s.-]/g, ""),
    });
  }

  /** Ne jamais exposer les identifiants internes (règle 14). */
  private toPublic(tx: Transaction, viewerWalletId: string) {
    const outgoing = tx.senderWalletId === viewerWalletId;
    return {
      id: tx.id,
      reference: tx.publicReference,
      type: tx.type,
      status: tx.status,
      direction: outgoing ? "out" : "in",
      amount: outgoing ? -tx.amount : tx.amount,
      fee: tx.fee,
      note: tx.note,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    };
  }
}
