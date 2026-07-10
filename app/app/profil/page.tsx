"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { demoGamification } from "@/lib/demo-data";
import { useWallet } from "@/lib/wallet-store";
import { Badge, Card } from "@/components/ui";
import { useTheme, type ThemePreference } from "@/components/theme";

export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { session, logout } = useWallet();
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const [copied, setCopied] = useState(false);

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(demoGamification.referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : rien à faire en démo.
    }
  }

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: "light", label: `☀️ ${t("profile.settings.theme.light")}` },
    { value: "dark", label: `🌙 ${t("profile.settings.theme.dark")}` },
    { value: "system", label: `💻 ${t("profile.settings.theme.system")}` },
  ];

  const localeOptions: { value: Locale; label: string }[] = [
    { value: "fr", label: "🇫🇷 Français" },
    { value: "en", label: "🇬🇧 English" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">{t("profile.title")}</h1>

      {/* Identité */}
      <Card className="flex items-center gap-4">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-brand-100 text-3xl dark:bg-brand-900/50"
          aria-hidden
        >
          👩🏾
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">
            {session?.firstName} {session?.lastName}
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {session?.username}
          </p>
        </div>
      </Card>

      {/* Vérification */}
      <Card className="space-y-2">
        <p className="text-sm font-semibold">{t("profile.verification")}</p>
        <Badge tone="green">
          ✓ {t("profile.verification.levelLabel")} {session?.verificationLevel ?? 1} —{" "}
          {t("profile.verification.level1")}
        </Badge>
        <button
          type="button"
          className="mt-1 block text-sm font-semibold text-brand-600 dark:text-brand-400"
        >
          {t("profile.verification.upgrade")} →
        </button>
      </Card>

      {/* Badges */}
      <section>
        <h2 className="mb-3 font-bold">{t("profile.badges")}</h2>
        <div className="grid grid-cols-4 gap-3">
          {demoGamification.badges.map((badge) => (
            <Card key={badge.id} className="!p-3 text-center">
              <span className="text-2xl" aria-hidden>
                {badge.emoji}
              </span>
              <p className="mt-1 text-[10px] font-medium leading-tight text-ink-600 dark:text-ink-300">
                {locale === "fr" ? badge.fr : badge.en}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Parrainage */}
      <Card className="space-y-3 bg-gradient-to-br from-brand-600 to-brand-800 !border-transparent text-white">
        <p className="font-bold">🤝 {t("profile.referral.title")}</p>
        <p className="text-sm text-brand-100">{t("profile.referral.desc")}</p>
        <button
          type="button"
          onClick={copyReferral}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-white/15 px-4 font-mono font-bold hover:bg-white/25"
        >
          <span>
            {t("profile.referral.code")} : {demoGamification.referralCode}
          </span>
          <span className="text-sm">{copied ? `✅ ${t("receive.copied")}` : "📋"}</span>
        </button>
      </Card>

      {/* Paramètres */}
      <section className="space-y-4">
        <h2 className="font-bold">{t("profile.settings")}</h2>

        <Card className="space-y-2">
          <p className="text-sm font-semibold">{t("profile.settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            {localeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={locale === option.value}
                onClick={() => setLocale(option.value)}
                className={`min-h-11 rounded-2xl text-sm font-semibold transition-colors ${
                  locale === option.value
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold">{t("profile.settings.theme")}</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={theme === option.value}
                onClick={() => setTheme(option.value)}
                className={`min-h-11 rounded-2xl text-sm font-semibold transition-colors ${
                  theme === option.value
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="!p-2">
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {[
              {
                icon: "🔔",
                label: t("profile.settings.notifications"),
                desc: undefined as string | undefined,
              },
              {
                icon: "🔐",
                label: t("profile.settings.security"),
                desc: t("profile.settings.security.desc"),
              },
              { icon: "👨‍👩‍👧", label: t("profile.parental"), desc: t("profile.parental.desc") },
              { icon: "💬", label: t("profile.support"), desc: undefined },
            ].map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <span className="text-xl" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    {item.desc ? (
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        {item.desc}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-ink-400" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/connexion");
        }}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
      >
        {t("profile.logout")}
      </button>

      <p className="pb-2 text-center text-xs text-ink-400 dark:text-ink-500">
        {t("common.demo")}
      </p>
    </div>
  );
}
