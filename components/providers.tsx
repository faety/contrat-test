"use client";

import { type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { WalletProvider } from "@/lib/wallet-store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <WalletProvider>{children}</WalletProvider>
    </I18nProvider>
  );
}
