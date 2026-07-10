"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, setAdminToken } from "@/lib/admin-api";
import { Card } from "@/components/ui";

/** Tuile de statistique : libellé + valeur en encre neutre (pas de couleur de série). */
export function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
}) {
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500 dark:text-ink-400">
        {icon ? <span aria-hidden>{icon}</span> : null}
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-black tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{sub}</p> : null}
    </Card>
  );
}

export function AdminTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left dark:border-ink-800">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">{children}</tbody>
        </table>
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-ink-500 dark:text-ink-400">
          Aucun résultat.
        </p>
      ) : null}
    </Card>
  );
}

/** Pastille d'état : icône + libellé, jamais la couleur seule. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; icon: string; label: string }> = {
    active: { tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300", icon: "✓", label: "Actif" },
    pending: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", icon: "⏳", label: "En attente" },
    blocked: { tone: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: "⛔", label: "Bloqué" },
    suspended: { tone: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: "⏸", label: "Suspendu" },
    paused: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", icon: "⏸", label: "En pause" },
    ended: { tone: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300", icon: "■", label: "Terminée" },
    COMPLETED: { tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300", icon: "✓", label: "Confirmée" },
    REVERSED: { tone: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300", icon: "↩", label: "Contrepassée" },
    FAILED: { tone: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: "✕", label: "Échouée" },
    PENDING: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", icon: "⏳", label: "En attente" },
    UNDER_REVIEW: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", icon: "🔎", label: "En examen" },
    BLOCKED: { tone: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: "⛔", label: "Bloquée" },
  };
  const entry = map[status] ?? {
    tone: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
    icon: "•",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.tone}`}
    >
      <span aria-hidden>{entry.icon}</span> {entry.label}
    </span>
  );
}

/** Charge des données admin ; redirige vers la connexion si le jeton a expiré. */
export function useAdminData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loader()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(undefined);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setAdminToken(null);
          router.replace("/admin/connexion");
          return;
        }
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIndex, ...deps]);

  return { data, error, loading, refresh: () => setRefreshIndex((index) => index + 1) };
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
    >
      ⚠️ {message}
    </p>
  );
}

export function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <tr key={row}>
          {Array.from({ length: cols }, (_, col) => (
            <td key={col} className="px-4 py-3">
              <span className="skeleton block h-4 w-full max-w-32 rounded bg-ink-100 dark:bg-ink-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
