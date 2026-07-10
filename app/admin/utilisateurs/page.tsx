"use client";

import { useState, type FormEvent } from "react";
import { adminFetch, type AdminUser } from "@/lib/admin-api";
import {
  AdminTable,
  ErrorNotice,
  LoadingRows,
  StatusPill,
  useAdminData,
} from "@/components/admin-ui";
import { Button, Card, Field, inputClasses } from "@/components/ui";

const numberFr = new Intl.NumberFormat("fr-FR");

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | undefined>();
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);

  const { data, error, loading, refresh } = useAdminData(
    () =>
      adminFetch<AdminUser[]>(
        `/v1/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`,
      ),
    [query],
  );

  async function setStatus(user: AdminUser, status: "active" | "blocked") {
    setActionError(undefined);
    try {
      await adminFetch(`/v1/admin/users/${user.publicId}/status`, {
        method: "PATCH",
        body: { status },
      });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  async function submitGrant(event: FormEvent) {
    event.preventDefault();
    if (!grantTarget) return;
    setGrantBusy(true);
    setActionError(undefined);
    try {
      await adminFetch(`/v1/admin/users/${grantTarget.publicId}/grant`, {
        method: "POST",
        body: { amount: Number.parseInt(grantAmount, 10), reason: grantReason },
      });
      setGrantTarget(null);
      setGrantAmount("");
      setGrantReason("");
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setGrantBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Utilisateurs</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Recherche, statuts, attribution de Boyia. Toutes les actions sont auditées.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
          className="flex gap-2"
        >
          <input
            aria-label="Rechercher un utilisateur"
            placeholder="Nom, téléphone, @pseudo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClasses} !min-h-11 w-56`}
          />
          <Button type="submit" variant="secondary" className="!min-h-11">
            Rechercher
          </Button>
        </form>
      </header>

      {error ? <ErrorNotice message={error} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <AdminTable
        headers={["Utilisateur", "Contact", "Rôle", "Niveau", "Solde", "Statut", "Actions"]}
        empty={!loading && data?.length === 0}
      >
        {loading ? <LoadingRows cols={7} /> : null}
        {data?.map((user) => (
          <tr key={user.publicId}>
            <td className="px-4 py-3">
              <span className="block font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">
                {user.username}
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-ink-600 dark:text-ink-300">
              {user.phoneNumber}
              {user.email ? <span className="block">{user.email}</span> : null}
            </td>
            <td className="px-4 py-3">{user.role}</td>
            <td className="px-4 py-3 text-center">{user.verificationLevel}</td>
            <td className="px-4 py-3 tabular-nums">{numberFr.format(user.balance)} ʙ</td>
            <td className="px-4 py-3">
              <StatusPill status={user.status} />
            </td>
            <td className="px-4 py-3">
              {user.role === "admin" ? (
                <span className="text-xs text-ink-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGrantTarget(user)}
                    className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-200 dark:bg-brand-900/50 dark:text-brand-300"
                  >
                    🎁 Attribuer
                  </button>
                  {user.status === "blocked" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(user, "active")}
                      className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
                    >
                      Réactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus(user, "blocked")}
                      className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                    >
                      Bloquer
                    </button>
                  )}
                </div>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>

      {/* Modale d'attribution */}
      {grantTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attribuer des Boyia"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
        >
          <Card className="w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">
              Attribuer des Boyia à {grantTarget.firstName} {grantTarget.lastName}
            </h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              L&apos;émission débite le compte système et crédite l&apos;utilisateur — le
              registre reste équilibré. L&apos;action est journalisée.
            </p>
            <form onSubmit={submitGrant} className="space-y-4">
              <Field label="Montant (Boyia)" htmlFor="grant-amount">
                <input
                  id="grant-amount"
                  inputMode="numeric"
                  required
                  value={grantAmount}
                  onChange={(event) => setGrantAmount(event.target.value.replace(/\D/g, ""))}
                  className={inputClasses}
                />
              </Field>
              <Field label="Motif (obligatoire)" htmlFor="grant-reason">
                <input
                  id="grant-reason"
                  required
                  maxLength={200}
                  value={grantReason}
                  onChange={(event) => setGrantReason(event.target.value)}
                  placeholder="Ex. : Défi entrepreneur junior"
                  className={inputClasses}
                />
              </Field>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setGrantTarget(null)}
                >
                  Annuler
                </Button>
                <Button type="submit" loading={grantBusy} className="flex-1">
                  Attribuer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
