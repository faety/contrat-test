"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { demoOffers } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";
import { Badge, BoyiaLogo, Card } from "@/components/ui";
import { LanguageSwitch } from "@/components/language-switch";

export default function LandingPage() {
  const { t, locale } = useI18n();

  const features = [
    { emoji: "🎓", title: t("landing.feature.learn.title"), desc: t("landing.feature.learn.desc") },
    { emoji: "🎁", title: t("landing.feature.earn.title"), desc: t("landing.feature.earn.desc") },
    { emoji: "🛍️", title: t("landing.feature.spend.title"), desc: t("landing.feature.spend.desc") },
    { emoji: "🔒", title: t("landing.feature.trust.title"), desc: t("landing.feature.trust.desc") },
  ];

  const steps = [
    { title: t("landing.how.step1.title"), desc: t("landing.how.step1.desc") },
    { title: t("landing.how.step2.title"), desc: t("landing.how.step2.desc") },
    { title: t("landing.how.step3.title"), desc: t("landing.how.step3.desc") },
  ];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BoyiaLogo size={36} />
          <span className="text-lg font-bold tracking-tight">Boyia</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link
            href="/connexion"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {t("landing.hero.login")}
          </Link>
        </div>
      </header>

      <main>
        {/* Héros */}
        <section className="mx-auto max-w-5xl px-4 pb-14 pt-8 text-center sm:pt-16">
          <Badge tone="amber" className="mb-5">
            ✨ {t("landing.demo.badge")}
          </Badge>
          <h1 className="mx-auto max-w-2xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-ink-600 dark:text-ink-300 sm:text-lg">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-brand-600 px-8 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 sm:w-auto"
            >
              {t("landing.hero.cta")}
            </Link>
            <Link
              href="/connexion"
              className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-ink-100 px-8 text-base font-semibold text-ink-900 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700 sm:w-auto"
            >
              👀 Démo
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {t("landing.disclaimer")}
          </p>
        </section>

        {/* Fonctionnalités */}
        <section className="mx-auto max-w-5xl px-4 pb-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="text-left">
                <span className="text-3xl" aria-hidden>
                  {feature.emoji}
                </span>
                <h2 className="mt-3 font-bold">{feature.title}</h2>
                <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-300">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-white py-14 dark:bg-ink-900">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("landing.how.title")}</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-lg font-black text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-300">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Offres publiques */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("landing.offers.title")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoOffers.slice(0, 3).map((offer) => (
              <Card key={offer.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl" aria-hidden>
                    {offer.emoji}
                  </span>
                  <Badge>{offer.highlight}</Badge>
                </div>
                <h3 className="mt-3 font-bold">
                  {locale === "fr" ? offer.titleFr : offer.titleEn}
                </h3>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  {locale === "fr" ? offer.descFr : offer.descEn}
                </p>
                <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
                  {offer.partner} · {t("discover.validUntil")}{" "}
                  {formatDate(offer.validUntil, locale)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Partenaires */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <Card className="bg-gradient-to-br from-brand-600 to-brand-800 !border-transparent p-8 text-white sm:p-10">
            <h2 className="text-2xl font-bold sm:text-3xl">{t("landing.partners.title")}</h2>
            <p className="mt-3 max-w-2xl text-brand-100">{t("landing.partners.desc")}</p>
            <Link
              href="/inscription"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              {t("landing.partners.cta")} →
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-ink-200 py-8 dark:border-ink-800">
        <p className="mx-auto max-w-3xl px-4 text-center text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          {t("landing.footer.legal")}
        </p>
      </footer>
    </div>
  );
}
