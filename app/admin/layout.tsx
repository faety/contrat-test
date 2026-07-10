"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAdminToken, setAdminToken } from "@/lib/admin-api";
import { BoyiaLogo } from "@/components/ui";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: "📊", exact: true },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
  { href: "/admin/transactions", label: "Transactions", icon: "🔁" },
  { href: "/admin/regles", label: "Règles de récompense", icon: "🎁" },
  { href: "/admin/audit", label: "Journal d'audit", icon: "🛡️" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/connexion";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoginPage && !getAdminToken()) {
      router.replace("/admin/connexion");
      return;
    }
    setReady(true);
  }, [isLoginPage, router, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Barre latérale */}
      <aside className="border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 p-4 lg:flex-col lg:items-stretch lg:gap-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <BoyiaLogo size={34} />
            <span>
              <span className="block text-sm font-black leading-tight">Boyia</span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">Administration</span>
            </span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-2xl px-3.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => {
              setAdminToken(null);
              router.replace("/admin/connexion");
            }}
            className="hidden min-h-11 items-center gap-2.5 rounded-2xl px-3.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 lg:flex"
          >
            <span aria-hidden>🚪</span> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
