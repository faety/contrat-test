"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { apiFetch, type ApiRecipient } from "@/lib/api";
import { demoSuggestions, type Transaction } from "@/lib/demo-data";
import { boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatFcfa } from "@/lib/format";
import { BackLink, Badge, Button, Card, Field, inputClasses } from "@/components/ui";

type Step = "recipient" | "amount" | "confirm" | "success";

export default function SendPage() {
  const { t } = useI18n();
  const { balances, limits, transfer } = useWallet();

  const [step, setStep] = useState<Step>("recipient");
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [recipient, setRecipient] = useState<ApiRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  const parsedAmount = Number.parseInt(amount, 10);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function lookup(target: string, event?: FormEvent) {
    event?.preventDefault();
    const trimmed = target.trim();
    if (!trimmed) {
      setError(t("send.error.recipient"));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const found = await apiFetch<ApiRecipient>(
        `/v1/wallet/recipients?query=${encodeURIComponent(trimmed)}`,
      );
      setRecipient(found);
      setIdentifier(trimmed);
      setStep("amount");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  function goToConfirm() {
    if (!amountValid) {
      setError(t("send.error.amount"));
      return;
    }
    if (parsedAmount > limits.perTransfer) {
      setError(`${t("send.error.limit")} (${formatBoyia(limits.perTransfer)} ʙ).`);
      return;
    }
    if (parsedAmount > balances.available) {
      setError(t("send.error.insufficient"));
      return;
    }
    setError(undefined);
    setStep("confirm");
  }

  async function confirm() {
    setBusy(true);
    setError(undefined);
    const outcome = await transfer({
      recipient: identifier,
      amount: parsedAmount,
      pin,
      note: note || undefined,
    });
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setResult(outcome.transaction);
    setStep("success");
  }

  return (
    <div className="space-y-6">
      <BackLink href="/app" label={t("common.back")} />
      <h1 className="text-2xl font-black tracking-tight">{t("send.title")}</h1>

      {step === "recipient" ? (
        <div className="space-y-4">
          <form onSubmit={(event) => lookup(query, event)} className="space-y-4">
            <Field label={t("send.recipient")} htmlFor="search" error={error}>
              <input
                id="search"
                placeholder={t("send.recipient.placeholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={inputClasses}
              />
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              {t("send.lookup")}
            </Button>
          </form>
          <p className="text-sm font-semibold text-ink-500 dark:text-ink-400">
            {t("send.suggestions")}
          </p>
          <Card className="!p-2">
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {demoSuggestions.map((suggestion) => (
                <li key={suggestion.identifier}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setQuery(suggestion.identifier);
                      void lookup(suggestion.identifier);
                    }}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <span
                      className="flex size-10 items-center justify-center rounded-full bg-ink-100 text-lg dark:bg-ink-800"
                      aria-hidden
                    >
                      {suggestion.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{suggestion.name}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        {suggestion.identifier}
                      </span>
                    </span>
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
              {recipient.isMerchant ? "🏪" : "👤"}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {recipient.firstName} {recipient.lastName}
              </p>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {recipient.username} · {recipient.phoneMasked}
              </p>
            </div>
            {recipient.isMerchant ? <Badge tone="green">✓</Badge> : null}
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
                  {recipient.firstName} {recipient.lastName} ({recipient.username})
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
              maxLength={6}
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
            <Button onClick={confirm} loading={busy} className="flex-1">
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
              <strong>
                {recipient.firstName} {recipient.lastName}
              </strong>{" "}
              {t("send.success.desc")}
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
