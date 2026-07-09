"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const tabs: { href: string; key: TranslationKey; icon: string; exact?: boolean }[] = [
  { href: "/app", key: "nav.home", icon: "🏠", exact: true },
  { href: "/app/decouvrir", key: "nav.discover", icon: "🧭" },
  { href: "/app/scanner", key: "nav.scan", icon: "▣" },
  { href: "/app/activites", key: "nav.activities", icon: "🏆" },
  { href: "/app/profil", key: "nav.profile", icon: "👤" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav
        aria-label={t("nav.home")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const isScan = tab.href === "/app/scanner";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5"
              >
                {isScan ? (
                  <span
                    className="flex size-12 -translate-y-4 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl text-white shadow-lg shadow-brand-600/30"
                    aria-hidden
                  >
                    {tab.icon}
                  </span>
                ) : (
                  <>
                    <span className={`text-xl ${active ? "" : "grayscale opacity-60"}`} aria-hidden>
                      {tab.icon}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        active
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-ink-500 dark:text-ink-400"
                      }`}
                    >
                      {t(tab.key)}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
