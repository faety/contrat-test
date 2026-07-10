"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { apiPublic, saveSession, type AuthResult } from "@/lib/api";
import { BackLink, BoyiaLogo, Button, Field, inputClasses } from "@/components/ui";

export default function RegisterPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("CI");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleForm(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const result = await apiPublic<{ publicId: string; demoOtp?: string }>(
        "/v1/auth/register",
        {
          method: "POST",
          body: { phoneNumber: phone, firstName, lastName, pin, country },
        },
      );
      setDemoOtpHint(result.demoOtp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const auth = await apiPublic<AuthResult>("/v1/auth/verify-otp", {
        method: "POST",
        body: { phoneNumber: phone, code: otp.trim() },
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

      {step === "form" ? (
        <div className="flex flex-1 flex-col justify-center py-8">
          <BoyiaLogo size={56} />
          <h1 className="mt-6 text-3xl font-black tracking-tight">{t("auth.register.title")}</h1>
          <p className="mt-2 text-ink-600 dark:text-ink-300">{t("auth.register.subtitle")}</p>

          <form onSubmit={handleForm} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("auth.firstName")} htmlFor="firstName">
                <input
                  id="firstName"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label={t("auth.lastName")} htmlFor="lastName">
                <input
                  id="lastName"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label={t("auth.country")} htmlFor="country">
              <select
                id="country"
                className={inputClasses}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="CI">🇨🇮 Côte d&apos;Ivoire</option>
                <option value="SN">🇸🇳 Sénégal</option>
                <option value="BF">🇧🇫 Burkina Faso</option>
                <option value="ML">🇲🇱 Mali</option>
                <option value="TG">🇹🇬 Togo</option>
                <option value="BJ">🇧🇯 Bénin</option>
              </select>
            </Field>
            <Field label={t("auth.phone")} htmlFor="phone">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+225 07 00 00 00 00"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label={t("auth.pinCreate")} htmlFor="pin" error={error}>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="••••"
                required
                minLength={4}
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                className={inputClasses}
              />
            </Field>
            <label className="flex items-start gap-3 text-sm text-ink-700 dark:text-ink-300">
              <input type="checkbox" required className="mt-1 size-4 accent-brand-600" />
              {t("auth.terms")}
            </label>
            <Button type="submit" loading={loading} className="w-full">
              {t("auth.register.submit")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-300">
            {t("auth.register.hasAccount")}{" "}
            <Link href="/connexion" className="font-semibold text-brand-600 dark:text-brand-400">
              {t("auth.login.submit")}
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center py-8">
          <span className="text-5xl" aria-hidden>
            📲
          </span>
          <h1 className="mt-6 text-3xl font-black tracking-tight">{t("auth.otp.title")}</h1>
          <p className="mt-2 text-ink-600 dark:text-ink-300">
            {t("auth.otp.subtitle")} <strong>{phone}</strong>
          </p>

          <form onSubmit={handleOtp} className="mt-8 space-y-5">
            <Field
              label="OTP"
              htmlFor="otp"
              hint={demoOtpHint ? `${t("auth.otp.hint")} (${demoOtpHint})` : undefined}
              error={error}
            >
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className={`${inputClasses} text-center text-2xl font-bold tracking-[0.5em]`}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              {t("auth.otp.submit")}
            </Button>
          </form>
        </div>
      )}

      <p className="pb-2 text-center text-xs text-ink-400 dark:text-ink-500">
        {t("auth.demo.note")}
      </p>
    </div>
  );
}
