"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { demoGamification, demoChallenges, demoOffers } from "@/lib/demo-data";
import { boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatFcfa } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { TransactionRow } from "@/components/transaction-list";

export default function HomePage() {
  const { t, locale } = useI18n();
  const { session, balances, transactions, loading, error, hideBalance, toggleHideBalance } =
    useWallet();

  const total = balances.available + balances.pending + balances.promotional;
  const activeChallenges = demoChallenges.filter((challenge) => challenge.joined);

  const quickActions = [
    { href: "/app/envoyer", icon: "↗️", label: t("home.actions.send") },
    { href: "/app/recevoir", icon: "↙️", label: t("home.actions.receive") },
    { href: "/app/scanner", icon: "▣", label: t("home.actions.scan") },
    { href: "/app/activites", icon: "🎁", label: t("home.actions.earn") },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-lg dark:bg-brand-900/50"
            aria-hidden
          >
            👩🏾
          </span>
          <div>
            <p className="text-sm text-ink-500 dark:text-ink-400">{t("home.greeting")} 👋</p>
            <p className="font-bold">{session?.firstName ?? "…"}</p>
          </div>
        </div>
        <Badge tone="brand">
          ⭐ {t("home.level")} ·{" "}
          {locale === "fr" ? demoGamification.levelFr : demoGamification.levelEn}
        </Badge>
      </header>

      {/* Carte de solde */}
      <Card className="bg-gradient-to-br from-brand-600 to-brand-800 !border-transparent text-white">
        <div className="flex items-start justify-between">
          <p className="text-sm text-brand-100">{t("home.balance.total")}</p>
          <button
            type="button"
            onClick={toggleHideBalance}
            aria-label={hideBalance ? t("home.balance.show") : t("home.balance.hide")}
            className="flex size-9 items-center justify-center rounded-full bg-white/15 text-sm hover:bg-white/25"
          >
            {hideBalance ? "🙈" : "👁️"}
          </button>
        </div>
        <p className="mt-1 text-4xl font-black tabular-nums tracking-tight">
          {hideBalance ? "••••" : formatBoyia(total)}{" "}
          <span className="text-xl font-bold text-brand-200">ʙ</span>
        </p>
        <p className="mt-1 text-sm text-brand-100">
          {hideBalance ? "•••• FCFA" : `≈ ${formatFcfa(boyiaToFcfa(total))}`} ·{" "}
          {t("home.balance.indicative")}
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-brand-100">
          <span className="rounded-full bg-white/15 px-2.5 py-1">
            {t("home.balance.available")} :{" "}
            <strong className="tabular-nums">
              {hideBalance ? "••••" : formatBoyia(balances.available)} ʙ
            </strong>
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">
            🔥 {demoGamification.streakDays} {t("home.streak")}
          </span>
        </div>
      </Card>

      {/* Actions rapides */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-3xl border border-ink-200/70 bg-white transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800"
          >
            <span className="text-xl" aria-hidden>
              {action.icon}
            </span>
            <span className="text-xs font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Récompenses en attente */}
      {balances.pending > 0 ? (
        <Card className="flex items-center gap-3 !bg-amber-50 !border-amber-200 dark:!bg-amber-900/20 dark:!border-amber-900/50">
          <span className="text-2xl" aria-hidden>
            ⏳
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("home.pending.title")}</p>
            <p className="text-xs text-ink-600 dark:text-ink-300">
              {formatBoyia(balances.pending)} ʙ {t("home.pending.desc")}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Défis en cours */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("home.challenges.title")}</h2>
          <Link
            href="/app/activites"
            className="text-sm font-semibold text-brand-600 dark:text-brand-400"
          >
            {t("home.transactions.all")} →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id} className="min-w-64 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {challenge.emoji}
                </span>
                <p className="text-sm font-bold">
                  {locale === "fr" ? challenge.nameFr : challenge.nameEn}
                </p>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-ink-500 dark:text-ink-400">
                  <span>
                    {challenge.progress}/{challenge.target}
                  </span>
                  <span>+{challenge.reward} ʙ</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={challenge.progress}
                  aria-valuemin={0}
                  aria-valuemax={challenge.target}
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Dernières transactions */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">{t("home.transactions.title")}</h2>
          <Link
            href="/app/portefeuille"
            className="text-sm font-semibold text-brand-600 dark:text-brand-400"
          >
            {t("home.transactions.all")} →
          </Link>
        </div>
        <Card className="!p-2">
          {error ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">
              ⚠️ {error}
            </p>
          ) : loading && transactions.length === 0 ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2].map((row) => (
                <span key={row} className="skeleton block h-12 rounded-2xl bg-ink-100 dark:bg-ink-800" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {transactions.slice(0, 4).map((tx) => (
                <li key={tx.id}>
                  <TransactionRow tx={tx} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Offres recommandées */}
      <section>
        <h2 className="mb-3 font-bold">{t("home.offers.title")}</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {demoOffers.slice(0, 3).map((offer) => (
            <Link key={offer.id} href="/app/decouvrir" className="min-w-56 shrink-0">
              <Card className="h-full transition-colors hover:border-brand-300">
                <div className="flex items-start justify-between">
                  <span className="text-2xl" aria-hidden>
                    {offer.emoji}
                  </span>
                  <Badge>{offer.highlight}</Badge>
                </div>
                <p className="mt-2 text-sm font-bold">
                  {locale === "fr" ? offer.titleFr : offer.titleEn}
                </p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{offer.partner}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
