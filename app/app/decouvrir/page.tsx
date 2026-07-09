"use client";

import { useState } from "react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { demoOffers, type Offer } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

type Category = "all" | Offer["category"];

const categories: { id: Category; key: TranslationKey; emoji: string }[] = [
  { id: "all", key: "discover.categories.all", emoji: "✨" },
  { id: "food", key: "discover.categories.food", emoji: "🍛" },
  { id: "education", key: "discover.categories.education", emoji: "🎓" },
  { id: "shopping", key: "discover.categories.shopping", emoji: "🛍️" },
  { id: "events", key: "discover.categories.events", emoji: "🎤" },
];

export default function DiscoverPage() {
  const { t, locale } = useI18n();
  const [category, setCategory] = useState<Category>("all");

  const offers = demoOffers.filter(
    (offer) => category === "all" || offer.category === category,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t("discover.title")}</h1>
        <p className="mt-1 text-ink-600 dark:text-ink-300">{t("discover.subtitle")}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            onClick={() => setCategory(item.id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
              category === item.id
                ? "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
            }`}
          >
            <span aria-hidden>{item.emoji}</span> {t(item.key)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <div className="flex items-start gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-3xl dark:bg-ink-800"
                aria-hidden
              >
                {offer.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">
                    {locale === "fr" ? offer.titleFr : offer.titleEn}
                  </h2>
                  <Badge>{offer.highlight}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  {locale === "fr" ? offer.descFr : offer.descEn}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                  <span className="font-semibold">{offer.partner}</span>
                  {offer.verified ? (
                    <Badge tone="green">✓ {t("discover.partner.verified")}</Badge>
                  ) : null}
                  <span>
                    {t("discover.validUntil")} {formatDate(offer.validUntil, locale)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
