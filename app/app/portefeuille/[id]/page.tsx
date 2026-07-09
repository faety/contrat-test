"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { formatBoyia, formatDateTime } from "@/lib/format";
import { BackLink, Badge, BoyiaLogo, Button, Card } from "@/components/ui";
import { QrCode } from "@/components/qr-code";
import { transactionTypeKey } from "@/components/transaction-list";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { getTransaction } = useWallet();

  const tx = getTransaction(id);
  if (!tx) {
    notFound();
  }

  const statusTone =
    tx.status === "completed" ? "green" : tx.status === "pending" ? "amber" : "neutral";
  const statusLabel =
    tx.status === "completed"
      ? t("wallet.status.completed")
      : tx.status === "pending"
        ? t("wallet.status.pending")
        : t("wallet.status.failed");

  return (
    <div className="space-y-6">
      <BackLink href="/app/portefeuille" label={t("common.back")} />

      <Card className="space-y-5 text-center">
        <div className="flex flex-col items-center gap-3 border-b border-dashed border-ink-200 pb-5 dark:border-ink-700">
          <BoyiaLogo size={44} />
          <p className="text-sm font-semibold text-ink-500 dark:text-ink-400">
            {t("wallet.receipt")}
          </p>
          <p className="text-4xl font-black tabular-nums tracking-tight">
            {formatBoyia(tx.amount, { signed: true })} ʙ
          </p>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>

        <dl className="space-y-3 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 dark:text-ink-400">{t(transactionTypeKey(tx.type))}</dt>
            <dd className="font-semibold text-right">{tx.counterparty}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 dark:text-ink-400">{t("wallet.reference")}</dt>
            <dd className="font-mono text-xs font-semibold">{tx.reference}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 dark:text-ink-400">Date</dt>
            <dd className="font-semibold">{formatDateTime(tx.dateIso, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 dark:text-ink-400">{t("wallet.fee")}</dt>
            <dd className="font-semibold tabular-nums">{formatBoyia(tx.fee)} ʙ</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 dark:text-ink-400">{t("wallet.balanceAfter")}</dt>
            <dd className="font-semibold tabular-nums">{formatBoyia(tx.balanceAfter)} ʙ</dd>
          </div>
          {tx.note ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500 dark:text-ink-400">Note</dt>
              <dd className="text-right italic">« {tx.note} »</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col items-center gap-2 border-t border-dashed border-ink-200 pt-5 dark:border-ink-700">
          <QrCode value={tx.reference} size={140} />
          <p className="text-xs text-ink-500 dark:text-ink-400">{t("wallet.receipt.verify")}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1">
            📤 {t("wallet.receipt.share")}
          </Button>
          <Button variant="secondary" className="flex-1">
            ⬇️ {t("wallet.receipt.download")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
