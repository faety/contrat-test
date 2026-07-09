"use client";

import { useI18n, type Locale } from "@/lib/i18n";

export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  const options: { value: Locale; label: string }[] = [
    { value: "fr", label: "FR" },
    { value: "en", label: "EN" },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-full bg-ink-100 p-1 dark:bg-ink-800"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          className={`min-h-9 rounded-full px-3 text-xs font-bold transition-colors ${
            locale === option.value
              ? "bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white"
              : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
