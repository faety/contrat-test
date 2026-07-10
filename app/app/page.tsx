"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-store";
import { boyiaToFcfa } from "@/lib/config";
import { formatBoyia, formatDateTime, formatFcfa } from "@/lib/format";
import { QrCode } from "@/components/qr-code";
import { transactionTypeKey } from "@/components/transaction-list";

/**
 * Accueil — design « super-app » : en-tête indigo avec solde centré,
 * carte QR Scanner, grille de raccourcis, liste de transactions à plat.
 */
export default function HomePage() {
  const { t, locale } = useI18n();
  const { session, balances, transactions, loading, error, hideBalance, toggleHideBalance } =
    useWallet();

  const total = balances.available + balances.pending + balances.promotional;

  const menu: { href: string; label: string; emoji: string; circle: string }[] = [
    { href: "/app/envoyer", label: t("home.menu.transfer"), emoji: "💸", circle: "bg-blue-100 dark:bg-blue-900/40" },
    { href: "/app/activites", label: t("home.menu.opportunities"), emoji: "🚀", circle: "bg-amber-100 dark:bg-amber-900/40" },
    { href: "/app/decouvrir", label: t("home.menu.shop"), emoji: "🏪", circle: "bg-red-100 dark:bg-red-900/40" },
    { href: "/app/recevoir", label: t("home.menu.card"), emoji: "💳", circle: "bg-purple-100 dark:bg-purple-900/40" },
    { href: "/app/portefeuille", label: t("home.menu.gifts"), emoji: "🎁", circle: "bg-emerald-100 dark:bg-emerald-900/40" },
    { href: "/app/decouvrir", label: t("home.menu.events"), emoji: "🎟️", circle: "bg-pink-100 dark:bg-pink-900/40" },
    { href: "/app/portefeuille", label: t("home.menu.spending"), emoji: "🧾", circle: "bg-violet-100 dark:bg-violet-900/40" },
  ];

  return (
    <div className="-mx-4 -mt-4">
      {/* En-tête indigo */}
      <header className="bg-[#4238c8] px-4 pb-20 pt-4 text-white">
        <div className="flex items-center justify-between">
          <Link
            href="/app/profil"
            aria-label={t("nav.profile")}
            className="flex size-11 items-center justify-center rounded-full text-2xl"
          >
            ⚙️
          </Link>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-[#4238c8] tabular-nums">
            💳 {hideBalance ? "••••" : formatFcfa(boyiaToFcfa(total))}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 pb-2">
          <p className="text-5xl font-black tabular-nums tracking-tight">
            {hideBalance ? "••••" : formatBoyia(total)}
            <span className="ml-1 text-2xl font-bold text-white/70">ʙ</span>
          </p>
          <button
            type="button"
            onClick={toggleHideBalance}
            aria-label={hideBalance ? t("home.balance.show") : t("home.balance.hide")}
            className="text-xl opacity-80"
          >
            {hideBalance ? "🙈" : "👁️"}
          </button>
        </div>
      </header>

      {/* Carte QR Scanner — chevauche l'en-tête et le corps */}
      <div className="relative z-10 -mt-14 px-8">
        <Link
          href="/app/scanner"
          className="relative block overflow-hidden rounded-3xl bg-[#25c1f2] p-5 shadow-lg shadow-[#25c1f2]/30"
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-20 [background:repeating-linear-gradient(45deg,#fff_0_10px,transparent_10px_26px)]"
          />
          <span className="relative mx-auto flex w-fit flex-col items-center gap-1.5 rounded-2xl bg-white p-3 pb-2">
            <QrCode value={session?.publicId ?? "boyia"} size={132} />
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              📷 {t("home.scan.cta")}
            </span>
          </span>
          <span
            aria-hidden
            className="absolute bottom-3 right-4 flex size-10 items-center justify-center rounded-xl bg-white/90 text-xl font-black text-[#25c1f2]"
          >
            ʙ
          </span>
        </Link>
      </div>

      {/* Grille de raccourcis */}
      <div className="grid grid-cols-4 gap-y-6 px-4 pt-8">
        {menu.map((item) => (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-2">
            <span
              className={`flex size-16 items-center justify-center rounded-full text-2xl ${item.circle}`}
              aria-hidden
            >
              {item.emoji}
            </span>
            <span className="text-[13px] font-semibold">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Transactions à plat */}
      <section className="mt-8 border-t-8 border-ink-100 dark:border-ink-900">
        {error ? (
          <p role="alert" className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-400">
            ⚠️ {error}
          </p>
        ) : loading && transactions.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((row) => (
              <span key={row} className="skeleton block h-14 rounded-2xl bg-ink-100 dark:bg-ink-800" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {transactions.slice(0, 8).map((tx) => (
              <li key={tx.id}>
                <Link
                  href={`/app/portefeuille/${tx.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-900"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-[#4238c8] dark:text-indigo-300">
                      {tx.type === "payment" ? `${t("wallet.type.payment")} ${tx.counterparty}` : tx.counterparty}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-500 dark:text-ink-400">
                      {t(transactionTypeKey(tx.type))} · {formatDateTime(tx.dateIso, locale)}
                    </span>
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-[#2f2a96] dark:text-indigo-200">
                    {tx.amount < 0 ? "−" : ""}
                    {formatBoyia(Math.abs(tx.amount))} ʙ
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="px-4 py-4">
          <Link
            href="/app/portefeuille"
            className="block text-center text-sm font-bold text-[#4238c8] dark:text-indigo-300"
          >
            {t("home.transactions.all")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
