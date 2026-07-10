import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Modèle de données principal (§32). Identifiants internes : UUID (jamais
 * séquentiels — règle 14) ; identifiants publics aléatoires exposés aux
 * clients (règle 15). Montants : entiers de Boyia. Types de colonnes choisis
 * pour être compatibles SQLite (démo) et PostgreSQL (production).
 */

export type UserRole = "user" | "merchant" | "admin";
export type UserStatus = "pending" | "active" | "blocked" | "suspended";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  publicId: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  phoneNumber: string;

  @Column({ type: "text", nullable: true })
  email: string | null;

  @Column({ type: "text" })
  firstName: string;

  @Column({ type: "text" })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  username: string;

  @Column({ type: "text", default: "CI" })
  country: string;

  @Column({ type: "text", default: "fr" })
  preferredLanguage: string;

  @Column({ type: "text", default: "user" })
  role: UserRole;

  @Column({ type: "text", default: "pending" })
  status: UserStatus;

  @Column({ type: "int", default: 0 })
  verificationLevel: number;

  /** Hachés avec Argon2id — jamais en clair (règle 16). */
  @Column({ type: "text", nullable: true })
  pinHash: string | null;

  @Column({ type: "text", nullable: true })
  passwordHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export type WalletStatus = "active" | "frozen" | "closed";

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", default: "user" })
  ownerType: string;

  @Index()
  @Column({ type: "text" })
  ownerId: string;

  @Column({ type: "text", default: "BOYIA" })
  currencyCode: string;

  @Column({ type: "text", default: "active" })
  status: WalletStatus;

  @CreateDateColumn()
  createdAt: Date;
}

export type LedgerAccountType =
  | "user_available"
  | "system_emission"
  | "system_fees";

@Entity("ledger_accounts")
export class LedgerAccount {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Null pour les comptes système (émission, frais). */
  @Index()
  @Column({ type: "text", nullable: true })
  walletId: string | null;

  @Column({ type: "text" })
  accountType: LedgerAccountType;

  @Column({ type: "text", default: "active" })
  status: string;
}

export type JournalStatus = "posted" | "reversed";

@Entity("journal_entries")
export class JournalEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  reference: string;

  @Column({ type: "text" })
  transactionType: string;

  @Column({ type: "text", default: "posted" })
  status: JournalStatus;

  @Column({ type: "text", default: "" })
  description: string;

  @Column({ type: "text" })
  initiatedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

export type LedgerDirection = "debit" | "credit";

@Entity("ledger_lines")
export class LedgerLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "text" })
  journalEntryId: string;

  @Index()
  @Column({ type: "text" })
  ledgerAccountId: string;

  @Column({ type: "text" })
  direction: LedgerDirection;

  @Column({ type: "int" })
  amount: number;

  @Column({ type: "simple-json", nullable: true })
  metadata: Record<string, unknown> | null;
}

/** Machine à états stricte (§33). */
export type TransactionStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED"
  | "REVERSED"
  | "UNDER_REVIEW";

export type TransactionType =
  | "transfer"
  | "reward"
  | "admin_grant"
  | "payment"
  | "reversal";

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  publicReference: string;

  @Index()
  @Column({ type: "text", nullable: true })
  senderWalletId: string | null;

  @Index()
  @Column({ type: "text", nullable: true })
  receiverWalletId: string | null;

  @Column({ type: "int" })
  amount: number;

  @Column({ type: "int", default: 0 })
  fee: number;

  @Column({ type: "text" })
  status: TransactionStatus;

  @Column({ type: "text" })
  type: TransactionType;

  @Index({ unique: true })
  @Column({ type: "text", nullable: true })
  idempotencyKey: string | null;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "text", nullable: true })
  journalEntryId: string | null;

  @Column({ type: "text", nullable: true })
  reversalOfId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "datetime", nullable: true })
  completedAt: Date | null;
}

@Entity("reward_rules")
export class RewardRule {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text", default: "" })
  description: string;

  @Column({ type: "text" })
  trigger: string;

  @Column({ type: "int" })
  rewardAmount: number;

  @Column({ type: "int", default: 0 })
  budget: number;

  @Column({ type: "int", default: 0 })
  spentAmount: number;

  @Column({ type: "text", default: "active" })
  status: "active" | "paused" | "ended";

  @CreateDateColumn()
  createdAt: Date;
}

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "text" })
  actorId: string;

  @Column({ type: "text" })
  actorRole: string;

  @Column({ type: "text" })
  action: string;

  @Column({ type: "text" })
  entityType: string;

  @Column({ type: "text" })
  entityId: string;

  @Column({ type: "simple-json", nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity("otp_codes")
export class OtpCode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "text" })
  phoneNumber: string;

  @Column({ type: "text" })
  code: string;

  @Column({ type: "datetime" })
  expiresAt: Date;

  @Column({ type: "int", default: 0 })
  attempts: number;

  @Column({ type: "int", default: 0 })
  consumed: number;
}

export const ALL_ENTITIES = [
  User,
  Wallet,
  LedgerAccount,
  JournalEntry,
  LedgerLine,
  Transaction,
  RewardRule,
  AuditLog,
  OtpCode,
];
