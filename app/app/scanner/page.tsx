"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { demoMerchant } from "@/lib/demo-data";
import type { Transaction } from "@/lib/demo-data";
import { BOYIA_CONFIG, boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatFcfa } from "@/lib/format";
import { Badge, Button, Card, Field, inputClasses } from "@/components/ui";

type Step = "idle" | "payment" | "success";

export default function ScanPage() {
  const { t } = useI18n();
  const { transfer, balances } = useWallet();
  const [step, setStep] = useState<Step>("idle");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  // Paiement mixte (§15.3) : au plus 30 % du montant payable en Boyia.
  const amountFcfa = demoMerchant.qrAmountFcfa;
  const maxFcfaInBoyia = amountFcfa * demoMerchant.maxBoyiaShare;
  const boyiaPart = Math.min(
    Math.floor(maxFcfaInBoyia / BOYIA_CONFIG.fcfaPerBoyia),
    balances.available,
  );
  const remainingFcfa = amountFcfa - boyiaToFcfa(boyiaPart);

  async function confirm() {
    setBusy(true);
    setError(undefined);
    // Paiement mixte : la part Boyia est réglée par un vrai transfert vers
    // le portefeuille du commerçant (type payment), PIN vérifié côté serveur.
    const outcome = await transfer({
      recipient: "@boyia.market",
      amount: boyiaPart,
      pin,
      note: `QR · ${formatFcfa(amountFcfa)}`,
      type: "payment",
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
      <h1 className="text-2xl font-black tracking-tight">{t("scan.title")}</h1>
      <p className="text-ink-600 dark:text-ink-300">{t("scan.desc")}</p>

      {step === "idle" ? (
        <>
          {/* Viseur simulé */}
          <div className="relative mx-auto flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-3xl bg-ink-900">
            <div className="absolute inset-6 rounded-2xl border-2 border-dashed border-white/40" />
            <span className="text-5xl" aria-hidden>
              📷
            </span>
            <span className="absolute inset-x-8 top-1/2 h-0.5 animate-pulse bg-brand-500" />
          </div>
          <p className="text-center text-xs text-ink-500 dark:text-ink-400">
            {t("scan.camera.note")}
          </p>
          <Card className="space-y-3">
            <p className="text-sm font-semibold">{t("scan.demo")}</p>
            <Button onClick={() => setStep("payment")} className="w-full">
              ▣ {t("scan.simulate")}
            </Button>
          </Card>
        </>
      ) : null}

      {step === "payment" ? (
        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="flex size-12 items-center justify-center rounded-2xl bg-ink-100 text-2xl dark:bg-ink-800"
                aria-hidden
              >
                {demoMerchant.emoji}
              </span>
              <div className="flex-1">
                <p className="font-bold">{demoMerchant.name}</p>
                <Badge tone="green">✓ {t("scan.pay.verified")}</Badge>
              </div>
            </div>
            <div className="rounded-2xl bg-ink-100 p-4 text-center dark:bg-ink-800">
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("scan.pay.amount")}</p>
              <p className="text-3xl font-black tabular-nums">{formatFcfa(amountFcfa)}</p>
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400">💡 {t("scan.pay.mixed")}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">{t("scan.pay.inBoyia")}</dt>
                <dd className="font-semibold tabular-nums">
                  {formatBoyia(boyiaPart)} ʙ (≈ {formatFcfa(boyiaToFcfa(boyiaPart))})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">{t("scan.pay.inFcfa")}</dt>
                <dd className="font-semibold tabular-nums">{formatFcfa(remainingFcfa)}</dd>
              </div>
            </dl>
          </Card>
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
            <Button variant="secondary" onClick={() => setStep("idle")} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button onClick={confirm} loading={busy} className="flex-1">
              {t("scan.pay.confirm")} {formatBoyia(boyiaPart)} ʙ
            </Button>
          </div>
        </div>
      ) : null}

      {step === "success" && result ? (
        <div className="space-y-6 pt-6 text-center">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/40">
            ✅
          </span>
          <div>
            <h2 className="text-2xl font-black">{t("send.success.title")}</h2>
            <p className="mt-2 text-ink-600 dark:text-ink-300">{t("scan.success")}</p>
            <p className="mt-4 text-4xl font-black tabular-nums">−{formatBoyia(boyiaPart)} ʙ</p>
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
