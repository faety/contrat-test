import type { Locale } from "@/lib/i18n";

export function formatBoyia(amount: number, options?: { signed?: boolean }): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("fr-FR").format(abs);
  const sign = options?.signed ? (amount >= 0 ? "+" : "−") : amount < 0 ? "−" : "";
  return `${sign}${formatted}`;
}

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} FCFA`;
}

export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
