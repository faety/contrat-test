"use client";

import { useState, type FormEvent } from "react";
import { adminFetch, type AdminTransaction } from "@/lib/admin-api";
import {
  AdminTable,
  ErrorNotice,
  LoadingRows,
  StatusPill,
  useAdminData,
} from "@/components/admin-ui";
import { Button, Card, Field, inputClasses } from "@/components/ui";

const numberFr = new Intl.NumberFormat("fr-FR");

export default function AdminTransactionsPage() {
  const [reverseTarget, setReverseTarget] = useState<AdminTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data, error, loading, refresh } = useAdminData(() =>
    adminFetch<AdminTransaction[]>("/v1/admin/transactions?limit=100"),
  );

  async function submitReverse(event: FormEvent) {
    event.preventDefault();
    if (!reverseTarget) return;
    setBusy(true);
    setActionError(undefined);
    try {
      await adminFetch(`/v1/admin/transactions/${reverseTarget.id}/reverse`, {
        method: "POST",
        body: { reason: reverseReason },
      });
      setReverseTarget(null);
      setReverseReason("");
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Une transaction confirmée n&apos;est jamais supprimée : toute correction passe par
          une contrepassation (§7).
        </p>
      </header>

      {error ? <ErrorNotice message={error} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <AdminTable
        headers={["Référence", "Type", "Montant", "Note", "Statut", "Date", "Actions"]}
        empty={!loading && data?.length === 0}
      >
        {loading ? <LoadingRows cols={7} /> : null}
        {data?.map((tx) => (
          <tr key={tx.id}>
            <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
            <td className="px-4 py-3">{tx.type}</td>
            <td className="px-4 py-3 tabular-nums">{numberFr.format(tx.amount)} ʙ</td>
            <td className="max-w-48 truncate px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
              {tx.note ?? "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={tx.status} />
            </td>
            <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
              {new Date(tx.createdAt).toLocaleString("fr-FR")}
            </td>
            <td className="px-4 py-3">
              {tx.status === "COMPLETED" && tx.type !== "reversal" ? (
                <button
                  type="button"
                  onClick={() => setReverseTarget(tx)}
                  className="whitespace-nowrap rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                >
                  ↩ Contrepasser
                </button>
              ) : (
                <span className="text-xs text-ink-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>

      {reverseTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Contrepasser une transaction"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
        >
          <Card className="w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">
              Contrepasser {reverseTarget.reference}
            </h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              Une écriture inverse de {numberFr.format(reverseTarget.amount)} ʙ sera créée.
              La transaction d&apos;origine passera au statut « Contrepassée ». Cette action
              est définitive et journalisée.
            </p>
            <form onSubmit={submitReverse} className="space-y-4">
              <Field label="Motif (obligatoire)" htmlFor="reverse-reason">
                <input
                  id="reverse-reason"
                  required
                  maxLength={200}
                  value={reverseReason}
                  onChange={(event) => setReverseReason(event.target.value)}
                  placeholder="Ex. : litige n° 2026-014, remboursement approuvé"
                  className={inputClasses}
                />
              </Field>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setReverseTarget(null)}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="danger" loading={busy} className="flex-1">
                  Contrepasser
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
