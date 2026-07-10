"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminFetch, setAdminToken } from "@/lib/admin-api";
import { BoyiaLogo, Button, Field, inputClasses } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@boyia.ci");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const result = await adminFetch<{ accessToken: string; user: { role: string } }>(
        "/v1/auth/admin/login",
        { method: "POST", body: { email, password } },
      );
      setAdminToken(result.accessToken);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <BoyiaLogo size={56} />
      <h1 className="mt-6 text-3xl font-black tracking-tight">Administration</h1>
      <p className="mt-2 text-ink-600 dark:text-ink-300">
        Espace réservé aux administrateurs Boyia.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Adresse e-mail" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field
          label="Mot de passe"
          htmlFor="password"
          hint="Démo : admin@boyia.ci / Boyia!Admin2026"
          error={error}
        >
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClasses}
          />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Se connecter
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-ink-400 dark:text-ink-500">
        Toutes les actions administratives sont journalisées dans le journal d&apos;audit.
      </p>
    </div>
  );
}
