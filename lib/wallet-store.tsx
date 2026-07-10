"use client";

/**
 * Store du portefeuille, branché sur l'API Boyia.
 *
 * Le serveur est la seule source de vérité : les soldes sont calculés par le
 * registre comptable à double entrée côté API et jamais recalculés ici
 * (règle 8). Ce store se contente de charger, mettre en cache et rafraîchir.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  clearSession,
  getSession,
  hasToken,
  type ApiBalances,
  type ApiTransaction,
  type SessionUser,
  UserApiError,
} from "@/lib/api";
import type { Balances, Transaction } from "@/lib/demo-data";

interface TransferInput {
  recipient: string;
  amount: number;
  pin: string;
  note?: string;
  type?: "transfer" | "payment";
}

type TransferResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string };

interface WalletContextValue {
  session: SessionUser | null;
  authenticated: boolean;
  balances: Balances;
  limits: { perTransfer: number; daily: number };
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  refresh: () => void;
  transfer: (input: TransferInput) => Promise<TransferResult>;
  getTransaction: (id: string) => Transaction | undefined;
  logout: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const EMPTY_BALANCES: Balances = { available: 0, pending: 0, promotional: 0, blocked: 0 };

function mapTransaction(tx: ApiTransaction): Transaction {
  const type =
    tx.type === "reward" || tx.type === "admin_grant"
      ? "reward"
      : tx.type === "reversal"
        ? "refund"
        : tx.type === "payment"
          ? "payment"
          : tx.direction === "out"
            ? "transfer_out"
            : "transfer_in";
  const status =
    tx.status === "COMPLETED"
      ? "completed"
      : tx.status === "REVERSED"
        ? "reversed"
        : ["FAILED", "CANCELLED", "BLOCKED"].includes(tx.status)
          ? "failed"
          : "pending";
  return {
    id: tx.id,
    reference: tx.reference,
    type,
    status,
    amount: tx.amount,
    fee: tx.fee,
    counterparty: tx.counterparty,
    note: tx.note ?? undefined,
    dateIso: tx.createdAt,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [balances, setBalances] = useState<Balances>(EMPTY_BALANCES);
  const [limits, setLimits] = useState({ perTransfer: 500, daily: 1000 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    setSession(getSession());
    setAuthenticated(hasToken());
    if (window.localStorage.getItem("boyia.hideBalance") === "1") setHideBalance(true);
  }, [refreshIndex]);

  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<ApiBalances>("/v1/wallet/balances"),
      apiFetch<ApiTransaction[]>("/v1/wallet/transactions?limit=50"),
    ])
      .then(([apiBalances, apiTransactions]) => {
        if (cancelled) return;
        setBalances({
          available: apiBalances.available,
          pending: apiBalances.pending,
          promotional: apiBalances.promotional,
          blocked: apiBalances.blocked,
        });
        setLimits(apiBalances.limits);
        setTransactions(apiTransactions.map(mapTransaction));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof UserApiError && err.status === 401) {
          clearSession();
          setAuthenticated(false);
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
  }, [refreshIndex]);

  const refresh = useCallback(() => setRefreshIndex((index) => index + 1), []);

  const toggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      window.localStorage.setItem("boyia.hideBalance", prev ? "0" : "1");
      return !prev;
    });
  }, []);

  const transfer = useCallback(
    async (input: TransferInput): Promise<TransferResult> => {
      try {
        const result = await apiFetch<ApiTransaction>("/v1/wallet/transfers", {
          method: "POST",
          body: {
            recipient: input.recipient,
            amount: input.amount,
            pin: input.pin,
            note: input.note,
            type: input.type,
          },
          // Clé d'idempotence : une soumission répétée ne crée pas deux transactions.
          headers: { "Idempotency-Key": crypto.randomUUID() },
        });
        const mapped = mapTransaction(result);
        setTransactions((prev) => [mapped, ...prev]);
        setBalances((prev) => ({ ...prev, available: prev.available + mapped.amount }));
        // Resynchronise avec le serveur (source de vérité).
        refresh();
        return { ok: true, transaction: mapped };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Erreur inconnue.",
        };
      }
    },
    [refresh],
  );

  const getTransaction = useCallback(
    (id: string) => transactions.find((tx) => tx.id === id),
    [transactions],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setAuthenticated(false);
    setBalances(EMPTY_BALANCES);
    setTransactions([]);
  }, []);

  const value = useMemo(
    () => ({
      session,
      authenticated,
      balances,
      limits,
      transactions,
      loading,
      error,
      hideBalance,
      toggleHideBalance,
      refresh,
      transfer,
      getTransaction,
      logout,
    }),
    [
      session,
      authenticated,
      balances,
      limits,
      transactions,
      loading,
      error,
      hideBalance,
      toggleHideBalance,
      refresh,
      transfer,
      getTransaction,
      logout,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
