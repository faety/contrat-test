"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { demoRecipients, type Recipient, type Transaction } from "@/lib/demo-data";
import { BOYIA_CONFIG, boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatFcfa } from "@/lib/format";
import { BackLink, Badge, Button, Card, Field, inputClasses } from "@/components/ui";

const DEMO_PIN = "1234";

type Step = "recipient" | "amount" | "confirm" | "success";

export default function SendPage() {
  const { t } = useI18n();
  const { balances, transfer } = useWallet();

  const [step, setStep] = useState<Step>("recipient");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<Transaction | null>(null);

  const parsedAmount = Number.parseInt(amount, 10);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const visibleRecipients = demoRecipients.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(search.toLowerCase()) ||
      candidate.username.toLowerCase().includes(search.toLowerCase()),
  );

  function goToAmount(selected: Recipient) {
    setRecipient(selected);
    setError(undefined);
    setStep("amount");
  }

  function goToConfirm() {
    if (!amountValid) {
      setError(t("send.error.amount"));
      return;
    }
    if (parsedAmount > BOYIA_CONFIG.transferLimitPerTx) {
      setError(
        `${t("send.error.limit")} (${formatBoyia(BOYIA_CONFIG.transferLimitPerTx)} ʙ).`,
      );
      return;
    }
    if (parsedAmount > balances.available) {
      setError(t("send.error.insufficient"));
      return;
    }
    setError(undefined);
    setStep("confirm");
  }

  function confirm() {
    if (pin !== DEMO_PIN) {
      setError(t("send.pin.error"));
      return;
    }
    if (!recipient) {
      setError(t("send.error.recipient"));
      return;
    }
    const outcome = transfer({
      recipientName: recipient.name,
      amount: parsedAmount,
      note: note || undefined,
    });
    if (!outcome.ok) {
      setError(
        outcome.error === "insufficient"
          ? t("send.error.insufficient")
          : `${t("send.error.limit")} (${formatBoyia(BOYIA_CONFIG.transferLimitPerTx)} ʙ).`,
      );
      return;
    }
    setError(undefined);
    setResult(outcome.transaction);
    setStep("success");
  }

  return (
    <div className="space-y-6">
      <BackLink href="/app" label={t("common.back")} />
      <h1 className="text-2xl font-black tracking-tight">{t("send.title")}</h1>

      {step === "recipient" ? (
        <div className="space-y-4">
          <Field label={t("send.recipient")} htmlFor="search">
            <input
              id="search"
              placeholder={t("send.recipient.placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <p className="text-sm font-semibold text-ink-500 dark:text-ink-400">
            {t("send.recent")}
          </p>
          <Card className="!p-2">
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {visibleRecipients.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => goToAmount(candidate)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <span
                      className="flex size-11 items-center justify-center rounded-full bg-ink-100 text-lg dark:bg-ink-800"
                      aria-hidden
                    >
                      {candidate.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{candidate.name}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        {candidate.username} · {candidate.phoneMasked}
                      </span>
                    </span>
                    {candidate.isNew ? <Badge tone="amber">new</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {step === "amount" && recipient ? (
        <div className="space-y-5">
          <Card className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-full bg-ink-100 text-lg dark:bg-ink-800"
              aria-hidden
            >
              {recipient.emoji}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{recipient.name}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">{recipient.phoneMasked}</p>
            </div>
          </Card>
          {recipient.isNew ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              ⚠️ {t("send.newRecipient")}
            </p>
          ) : null}
          <Field
            label={`${t("send.amount")} (${t("home.balance.available")} : ${formatBoyia(balances.available)} ʙ)`}
            htmlFor="amount"
            error={error}
          >
            <div className="relative">
              <input
                id="amount"
                inputMode="numeric"
                placeholder="100"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                className={`${inputClasses} pr-12 text-2xl font-bold tabular-nums`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-400">
                ʙ
              </span>
            </div>
            {amountValid ? (
              <p className="text-xs text-ink-500 dark:text-ink-400">
                ≈ {formatFcfa(boyiaToFcfa(parsedAmount))} · {t("home.balance.indicative")}
              </p>
            ) : null}
          </Field>
          <Field label={t("send.note")} htmlFor="note">
            <input
              id="note"
              placeholder={t("send.note.placeholder")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={80}
              className={inputClasses}
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("recipient")} className="flex-1">
              {t("common.back")}
            </Button>
            <Button onClick={goToConfirm} className="flex-1">
              {t("send.continue")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "confirm" && recipient ? (
        <div className="space-y-5">
          <Card className="space-y-3">
            <p className="font-bold">{t("send.summary")}</p>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">{t("send.summary.to")}</dt>
                <dd className="font-semibold">
                  {recipient.emoji} {recipient.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">{t("send.summary.amount")}</dt>
                <dd className="font-semibold tabular-nums">{formatBoyia(parsedAmount)} ʙ</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">{t("send.summary.fee")}</dt>
                <dd className="font-semibold tabular-nums">0 ʙ</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2.5 dark:border-ink-800">
                <dt className="font-bold">{t("send.summary.total")}</dt>
                <dd className="font-black tabular-nums">{formatBoyia(parsedAmount)} ʙ</dd>
              </div>
            </dl>
          </Card>
          <p className="rounded-2xl bg-ink-100 px-4 py-3 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            ⚠️ {t("send.summary.warning")}
          </p>
          <Field
            label={t("send.pin.title")}
            htmlFor="pin"
            hint={t("send.pin.hint")}
            error={error}
          >
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className={`${inputClasses} text-center text-2xl tracking-[0.5em]`}
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("amount")} className="flex-1">
              {t("common.back")}
            </Button>
            <Button onClick={confirm} className="flex-1">
              {t("send.confirm")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "success" && recipient && result ? (
        <div className="space-y-6 pt-6 text-center">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/40">
            ✅
          </span>
          <div>
            <h2 className="text-2xl font-black">{t("send.success.title")}</h2>
            <p className="mt-2 text-ink-600 dark:text-ink-300">
              <strong>{recipient.name}</strong> {t("send.success.desc")}
            </p>
            <p className="mt-4 text-4xl font-black tabular-nums">
              −{formatBoyia(parsedAmount)} ʙ
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href={`/app/portefeuille/${result.id}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700"
            >
              🧾 {t("send.viewReceipt")}
            </Link>
            <Link
              href="/app"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink-100 px-6 text-sm font-semibold hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700"
            >
              {t("send.backHome")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
