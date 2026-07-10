"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { apiPublic, saveSession, type AuthResult } from "@/lib/api";
import { BackLink, BoyiaLogo, Button, Field, inputClasses } from "@/components/ui";

export default function LoginPage() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const auth = await apiPublic<AuthResult>("/v1/auth/login", {
        method: "POST",
        body: { phoneNumber: phone, pin },
      });
      saveSession(auth);
      // Navigation complète : les providers relisent la session au chargement.
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <BackLink href="/" label={t("common.back")} />
      <div className="flex flex-1 flex-col justify-center py-8">
        <BoyiaLogo size={56} />
        <h1 className="mt-6 text-3xl font-black tracking-tight">{t("auth.login.title")}</h1>
        <p className="mt-2 text-ink-600 dark:text-ink-300">{t("auth.login.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Field label={t("auth.phone")} htmlFor="phone">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+225 07 00 00 00 42"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field
            label={t("auth.pin")}
            htmlFor="pin"
            hint={t("auth.demo.credentials")}
            error={error}
          >
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              required
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            {t("auth.login.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-300">
          {t("auth.login.noAccount")}{" "}
          <Link href="/inscription" className="font-semibold text-brand-600 dark:text-brand-400">
            {t("auth.login.signup")}
          </Link>
        </p>
        <p className="mt-8 text-center text-xs text-ink-400 dark:text-ink-500">
          {t("auth.demo.note")}
        </p>
      </div>
    </div>
  );
}
