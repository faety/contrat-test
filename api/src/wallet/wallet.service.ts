import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, In } from "typeorm";
import * as argon2 from "argon2";
import { Transaction, User, Wallet } from "../entities";
import { LedgerService } from "../ledger/ledger.service";
import { TransactionsService } from "../ledger/transactions.service";
import { config } from "../config";

function maskPhone(phone: string): string {
  return `${phone.slice(0, 6)} •• •• ${phone.slice(-2)}`;
}

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
      // Catégories supplémentaires (§6.5) : comptes dédiés à venir — zéro pour l'instant.
      pending: 0,
      promotional: 0,
      blocked: 0,
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
    const names = await this.resolveWalletNames(rows, wallet.id);
    return rows.map((tx) => this.toPublic(tx, wallet.id, names));
  }

  /** Résout les noms d'affichage des portefeuilles contreparties. */
  private async resolveWalletNames(
    rows: Transaction[],
    viewerWalletId: string,
  ): Promise<Map<string, string>> {
    const otherWalletIds = new Set<string>();
    for (const tx of rows) {
      const other = tx.senderWalletId === viewerWalletId ? tx.receiverWalletId : tx.senderWalletId;
      if (other) otherWalletIds.add(other);
    }
    const names = new Map<string, string>();
    if (otherWalletIds.size === 0) return names;
    const wallets = await this.dataSource.manager.findBy(Wallet, {
      id: In([...otherWalletIds]),
    });
    const owners = await this.dataSource.manager.findBy(User, {
      id: In(wallets.map((w) => w.ownerId)),
    });
    const ownerById = new Map(owners.map((user) => [user.id, user]));
    for (const w of wallets) {
      const owner = ownerById.get(w.ownerId);
      if (owner) names.set(w.id, `${owner.firstName} ${owner.lastName}`);
    }
    return names;
  }

  /** Recherche d'un destinataire par téléphone ou @pseudo (§14.1, §14.3). */
  async lookupRecipient(viewerUserId: string, query: string) {
    const user = await this.findRecipient(query);
    if (!user || user.status !== "active" || user.role === "admin") {
      throw new NotFoundException("Destinataire introuvable.");
    }
    if (user.id === viewerUserId) {
      throw new BadRequestException("Impossible de transférer vers soi-même.");
    }
    // Vérifie si un transfert a déjà eu lieu vers ce destinataire (avertissement §14.3).
    const viewerWallet = await this.getWalletForUser(viewerUserId);
    const recipientWallet = await this.getWalletForUser(user.id);
    const previous = await this.dataSource.manager.countBy(Transaction, {
      senderWalletId: viewerWallet.id,
      receiverWalletId: recipientWallet.id,
    });
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phoneMasked: maskPhone(user.phoneNumber),
      isMerchant: user.role === "merchant",
      isNew: previous === 0,
    };
  }

  /** Transfert vers un autre utilisateur identifié par téléphone ou nom d'utilisateur (§14.1). */
  async transferByIdentifier(input: {
    senderUserId: string;
    recipient: string;
    amount: number;
    pin: string;
    note?: string;
    idempotencyKey?: string;
    type?: "transfer" | "payment";
  }) {
    // Code PIN transactionnel exigé pour toute opération sensible (§9.4).
    const sender = await this.dataSource.manager.findOneBy(User, { id: input.senderUserId });
    if (!sender || !sender.pinHash || !(await argon2.verify(sender.pinHash, input.pin))) {
      throw new ForbiddenException("Code PIN incorrect.");
    }
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
      type: input.type ?? "transfer",
    });
    const names = new Map([
      [receiverWallet.id, `${recipientUser.firstName} ${recipientUser.lastName}`],
    ]);
    return {
      ...this.toPublic(tx, senderWallet.id, names),
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
  private toPublic(tx: Transaction, viewerWalletId: string, names?: Map<string, string>) {
    const outgoing = tx.senderWalletId === viewerWalletId;
    const otherWalletId = outgoing ? tx.receiverWalletId : tx.senderWalletId;
    const counterparty =
      (otherWalletId ? names?.get(otherWalletId) : undefined) ??
      (tx.type === "reward" || tx.type === "admin_grant" ? (tx.note ?? "Boyia") : "Boyia");
    return {
      id: tx.id,
      reference: tx.publicReference,
      type: tx.type,
      status: tx.status,
      direction: outgoing ? "out" : "in",
      amount: outgoing ? -tx.amount : tx.amount,
      fee: tx.fee,
      note: tx.note,
      counterparty,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    };
  }
}
