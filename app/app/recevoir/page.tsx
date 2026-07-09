"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { demoUser } from "@/lib/demo-data";
import { BackLink, Button, Card } from "@/components/ui";
import { QrCode } from "@/components/qr-code";

export default function ReceivePage() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(demoUser.username);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : rien à faire en démo.
    }
  }

  return (
    <div className="space-y-6">
      <BackLink href="/app" label={t("common.back")} />
      <h1 className="text-2xl font-black tracking-tight">{t("receive.title")}</h1>
      <p className="text-ink-600 dark:text-ink-300">{t("receive.desc")}</p>

      <Card className="flex flex-col items-center gap-5 py-8">
        <QrCode value={demoUser.publicId} size={220} />
        <div className="text-center">
          <p className="text-lg font-bold">
            {demoUser.firstName} {demoUser.lastName}
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {t("receive.username")} : <strong>{demoUser.username}</strong>
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">{demoUser.phoneMasked}</p>
        </div>
        <Button variant="secondary" onClick={copy}>
          {copied ? `✅ ${t("receive.copied")}` : `📋 ${t("receive.copy")}`}
        </Button>
      </Card>
    </div>
  );
}
