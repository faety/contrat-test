"use client";

import { adminFetch, type AdminDashboard } from "@/lib/admin-api";
import {
  AdminTable,
  ErrorNotice,
  LoadingRows,
  StatTile,
  StatusPill,
  useAdminData,
} from "@/components/admin-ui";
import { Card } from "@/components/ui";

const numberFr = new Intl.NumberFormat("fr-FR");

const flagLabels: Record<string, string> = {
  topUpWithCash: "Achat de Boyia en espèces",
  cashOut: "Retrait en espèces",
  mobileMoney: "Mobile Money",
  internationalTransfer: "Transfert international",
};

export default function AdminDashboardPage() {
  const { data, error, loading } = useAdminData(() =>
    adminFetch<AdminDashboard>("/v1/admin/dashboard"),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Vue globale de la plateforme Boyia.
        </p>
      </header>

      {error ? <ErrorNotice message={error} /> : null}

      {/* Rangée de tuiles — utilisateurs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Utilisateurs"
          icon="👥"
          value={data ? numberFr.format(data.users.total) : "—"}
        />
        <StatTile
          label="Actifs"
          icon="✅"
          value={data ? numberFr.format(data.users.active) : "—"}
        />
        <StatTile
          label="Vérifiés (niveau ≥ 1)"
          icon="🪪"
          value={data ? numberFr.format(data.users.verified) : "—"}
        />
        <StatTile
          label="Bloqués"
          icon="⛔"
          value={data ? numberFr.format(data.users.blocked) : "—"}
        />
      </div>

      {/* Rangée de tuiles — économie Boyia */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Boyia émis"
          icon="🪙"
          value={data ? `${numberFr.format(data.boyia.emitted)} ʙ` : "—"}
          sub={
            data
              ? `≈ ${numberFr.format(data.boyia.emitted * data.boyia.fcfaPerBoyia)} FCFA`
              : undefined
          }
        />
        <StatTile
          label="En circulation"
          icon="🔄"
          value={data ? `${numberFr.format(data.boyia.inCirculation)} ʙ` : "—"}
        />
        <StatTile
          label="Transactions confirmées"
          icon="🧾"
          value={data ? numberFr.format(data.transactions.completed) : "—"}
        />
        <StatTile
          label="Volume échangé"
          icon="📈"
          value={data ? `${numberFr.format(data.transactions.volume)} ʙ` : "—"}
        />
      </div>

      {/* État du registre + fonctions réglementées */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold">Registre comptable</p>
          {data ? (
            data.boyia.ledgerBalanced ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                <span aria-hidden>✓</span> Équilibré — somme des écritures : 0
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800 dark:bg-red-900/50 dark:text-red-300">
                <span aria-hidden>✕</span> Déséquilibre détecté :{" "}
                {numberFr.format(data.boyia.ledgerImbalance)} ʙ — investigation requise
              </p>
            )
          ) : (
            <p className="mt-2 text-sm text-ink-500">…</p>
          )}
          <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
            Valeur de référence : 1 Boyia = {data?.boyia.fcfaPerBoyia ?? "—"} FCFA (interne,
            configurable).
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold">Fonctions réglementées (§37)</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data
              ? Object.entries(data.featureFlags).map(([flag, enabled]) => (
                  <li key={flag} className="flex items-center justify-between gap-3">
                    <span className="text-ink-600 dark:text-ink-300">
                      {flagLabels[flag] ?? flag}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        enabled
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                      }`}
                    >
                      {enabled ? "Activée" : "🔒 Désactivée"}
                    </span>
                  </li>
                ))
              : null}
          </ul>
        </Card>
      </div>

      {/* Dernières transactions */}
      <section>
        <h2 className="mb-3 font-bold">Dernières transactions</h2>
        <AdminTable
          headers={["Référence", "Type", "Montant", "Statut", "Date"]}
          empty={!loading && data?.transactions.recent.length === 0}
        >
          {loading ? <LoadingRows cols={5} /> : null}
          {data?.transactions.recent.map((tx) => (
            <tr key={tx.id}>
              <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
              <td className="px-4 py-3">{tx.type}</td>
              <td className="px-4 py-3 tabular-nums">{numberFr.format(tx.amount)} ʙ</td>
              <td className="px-4 py-3">
                <StatusPill status={tx.status} />
              </td>
              <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
                {new Date(tx.createdAt).toLocaleString("fr-FR")}
              </td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
