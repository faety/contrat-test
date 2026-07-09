"use client";

import Link from "next/link";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { formatBoyia, formatDateTime } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/demo-data";

const typeIcons: Record<TransactionType, string> = {
  reward: "🎁",
  transfer_in: "↙️",
  transfer_out: "↗️",
  payment: "🛍️",
  refund: "↩️",
};

export function transactionTypeKey(type: TransactionType): TranslationKey {
  return `wallet.type.${type}` as TranslationKey;
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const { t, locale } = useI18n();
  const credit = tx.amount > 0;
  return (
    <Link
      href={`/app/portefeuille/${tx.id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-lg dark:bg-ink-800"
        aria-hidden
      >
        {typeIcons[tx.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{tx.counterparty}</span>
        <span className="block text-xs text-ink-500 dark:text-ink-400">
          {t(transactionTypeKey(tx.type))} · {formatDateTime(tx.dateIso, locale)}
        </span>
      </span>
      <span className="text-right">
        <span
          className={`block text-sm font-semibold tabular-nums ${
            credit ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {formatBoyia(tx.amount, { signed: true })} ʙ
        </span>
        {tx.status === "pending" ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {t("wallet.status.pending")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const { t } = useI18n();
  if (transactions.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-500 dark:text-ink-400">
        {t("wallet.empty")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-ink-100 dark:divide-ink-800">
      {transactions.map((tx) => (
        <li key={tx.id}>
          <TransactionRow tx={tx} />
        </li>
      ))}
    </ul>
  );
}
