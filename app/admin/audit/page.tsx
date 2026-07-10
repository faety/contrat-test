"use client";

import { adminFetch, type AdminAuditLog } from "@/lib/admin-api";
import { AdminTable, ErrorNotice, LoadingRows, useAdminData } from "@/components/admin-ui";

export default function AdminAuditPage() {
  const { data, error, loading } = useAdminData(() =>
    adminFetch<AdminAuditLog[]>("/v1/admin/audit-logs?limit=100"),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Toutes les actions administratives sont journalisées et immuables (règle 18).
        </p>
      </header>

      {error ? <ErrorNotice message={error} /> : null}

      <AdminTable
        headers={["Date", "Action", "Entité", "Détails", "Acteur"]}
        empty={!loading && data?.length === 0}
      >
        {loading ? <LoadingRows cols={5} /> : null}
        {data?.map((log) => (
          <tr key={log.id}>
            <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
              {new Date(log.createdAt).toLocaleString("fr-FR")}
            </td>
            <td className="px-4 py-3 font-mono text-xs font-semibold">{log.action}</td>
            <td className="px-4 py-3 text-xs">
              {log.entityType}
              <span className="block font-mono text-ink-500 dark:text-ink-400">
                {log.entityId}
              </span>
            </td>
            <td className="max-w-72 px-4 py-3 text-xs text-ink-600 dark:text-ink-300">
              {log.details ? (
                <code className="block truncate">{JSON.stringify(log.details)}</code>
              ) : (
                "—"
              )}
            </td>
            <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
              {log.actorRole}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
