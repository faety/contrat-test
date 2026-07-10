"use client";

import { useState, type FormEvent } from "react";
import { adminFetch, type AdminRewardRule } from "@/lib/admin-api";
import {
  AdminTable,
  ErrorNotice,
  LoadingRows,
  StatusPill,
  useAdminData,
} from "@/components/admin-ui";
import { Button, Card, Field, inputClasses } from "@/components/ui";

const numberFr = new Intl.NumberFormat("fr-FR");

export default function AdminRewardRulesPage() {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data, error, loading, refresh } = useAdminData(() =>
    adminFetch<AdminRewardRule[]>("/v1/admin/reward-rules"),
  );

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setActionError(undefined);
    try {
      await adminFetch("/v1/admin/reward-rules", {
        method: "POST",
        body: {
          name,
          trigger,
          description: description || undefined,
          rewardAmount: Number.parseInt(amount, 10),
          budget: budget ? Number.parseInt(budget, 10) : undefined,
        },
      });
      setName("");
      setTrigger("");
      setDescription("");
      setAmount("");
      setBudget("");
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(rule: AdminRewardRule) {
    setActionError(undefined);
    try {
      await adminFetch(`/v1/admin/reward-rules/${rule.id}/status`, {
        method: "PATCH",
        body: { status: rule.status === "active" ? "paused" : "active" },
      });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Règles de récompense</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Le moteur de règles permet de créer des récompenses sans modifier le code (§16).
        </p>
      </header>

      {error ? <ErrorNotice message={error} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <Card>
        <h2 className="font-bold">Nouvelle règle</h2>
        <form onSubmit={submitCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="rule-name">
            <input
              id="rule-name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. : Achat > 10 000 FCFA"
              className={inputClasses}
            />
          </Field>
          <Field label="Déclencheur" htmlFor="rule-trigger" hint="Identifiant d'événement, ex. purchase.over_10000">
            <input
              id="rule-trigger"
              required
              maxLength={60}
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder="purchase.over_10000"
              className={inputClasses}
            />
          </Field>
          <Field label="Récompense (Boyia)" htmlFor="rule-amount">
            <input
              id="rule-amount"
              required
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
              className={inputClasses}
            />
          </Field>
          <Field label="Budget maximum (Boyia, facultatif)" htmlFor="rule-budget">
            <input
              id="rule-budget"
              inputMode="numeric"
              value={budget}
              onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))}
              className={inputClasses}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description (facultatif)" htmlFor="rule-desc">
              <input
                id="rule-desc"
                maxLength={300}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy}>
              Créer la règle
            </Button>
          </div>
        </form>
      </Card>

      <AdminTable
        headers={["Règle", "Déclencheur", "Récompense", "Budget", "Statut", "Actions"]}
        empty={!loading && data?.length === 0}
      >
        {loading ? <LoadingRows cols={6} /> : null}
        {data?.map((rule) => (
          <tr key={rule.id}>
            <td className="px-4 py-3">
              <span className="block font-semibold">{rule.name}</span>
              {rule.description ? (
                <span className="block max-w-64 truncate text-xs text-ink-500 dark:text-ink-400">
                  {rule.description}
                </span>
              ) : null}
            </td>
            <td className="px-4 py-3 font-mono text-xs">{rule.trigger}</td>
            <td className="px-4 py-3 tabular-nums">{numberFr.format(rule.rewardAmount)} ʙ</td>
            <td className="px-4 py-3 tabular-nums text-xs text-ink-600 dark:text-ink-300">
              {rule.budget > 0
                ? `${numberFr.format(rule.spentAmount)} / ${numberFr.format(rule.budget)} ʙ`
                : "Illimité"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={rule.status} />
            </td>
            <td className="px-4 py-3">
              {rule.status !== "ended" ? (
                <button
                  type="button"
                  onClick={() => toggle(rule)}
                  className="whitespace-nowrap rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200"
                >
                  {rule.status === "active" ? "⏸ Mettre en pause" : "▶ Activer"}
                </button>
              ) : (
                <span className="text-xs text-ink-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
