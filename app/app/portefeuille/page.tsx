"use client";

import { useMemo, useState } from "react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { BOYIA_CONFIG, boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatFcfa } from "@/lib/format";
import { BackLink, Card } from "@/components/ui";
import { TransactionList } from "@/components/transaction-list";
import type { Transaction } from "@/lib/demo-data";

type Filter = "all" | "received" | "sent" | "rewards" | "payments";

const filters: { id: Filter; key: TranslationKey }[] = [
  { id: "all", key: "wallet.filter.all" },
  { id: "received", key: "wallet.filter.received" },
  { id: "sent", key: "wallet.filter.sent" },
  { id: "rewards", key: "wallet.filter.rewards" },
  { id: "payments", key: "wallet.filter.payments" },
];

function matchesFilter(tx: Transaction, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "received":
      return tx.type === "transfer_in" || tx.type === "refund";
    case "sent":
      return tx.type === "transfer_out";
    case "rewards":
      return tx.type === "reward";
    case "payments":
      return tx.type === "payment";
  }
}

export default function WalletPage() {
  const { t } = useI18n();
  const { balances, transactions } = useWallet();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => transactions.filter((tx) => matchesFilter(tx, filter)),
    [transactions, filter],
  );

  const balanceCards = [
    { label: t("wallet.available"), value: balances.available, emoji: "✅" },
    { label: t("wallet.pending"), value: balances.pending, emoji: "⏳" },
    { label: t("wallet.promo"), value: balances.promotional, emoji: "🎟️" },
    { label: t("wallet.blocked"), value: balances.blocked, emoji: "🔒" },
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/app" label={t("common.back")} />
      <h1 className="text-2xl font-black tracking-tight">{t("wallet.title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        {balanceCards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              <span aria-hidden>{card.emoji}</span> {card.label}
            </p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatBoyia(card.value)} ʙ</p>
            <p className="text-xs text-ink-400 dark:text-ink-500">
              ≈ {formatFcfa(boyiaToFcfa(card.value))}
            </p>
          </Card>
        ))}
      </div>

      <Card className="!bg-ink-100/60 dark:!bg-ink-900">
        <p className="text-sm font-semibold">{t("wallet.limits")}</p>
        <div className="mt-2 flex gap-4 text-sm text-ink-600 dark:text-ink-300">
          <span>
            {t("wallet.limits.perTx")} :{" "}
            <strong>{formatBoyia(BOYIA_CONFIG.transferLimitPerTx)} ʙ</strong>
          </span>
          <span>
            {t("wallet.limits.daily")} :{" "}
            <strong>{formatBoyia(BOYIA_CONFIG.transferDailyLimit)} ʙ</strong>
          </span>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-bold">{t("wallet.history")}</h2>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors ${
                filter === item.id
                  ? "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
        <Card className="!p-2">
          <TransactionList transactions={filtered} />
        </Card>
      </section>
    </div>
  );
}
