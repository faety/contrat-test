"use client";

/**
 * Store de démonstration du portefeuille (côté client uniquement).
 *
 * ⚠️ En production, aucun solde n'est calculé dans l'interface : le serveur
 * est la seule source de vérité, via le registre comptable à double entrée
 * (cahier des charges §7 et règle 8 des règles de développement). Ce store
 * ne sert qu'à simuler les parcours pour la démo web.
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
  initialBalances,
  initialTransactions,
  type Balances,
  type Transaction,
} from "@/lib/demo-data";
import { BOYIA_CONFIG } from "@/lib/config";

interface TransferInput {
  recipientName: string;
  amount: number;
  note?: string;
}

interface PaymentInput {
  merchantName: string;
  amountBoyia: number;
  note?: string;
}

type TransferResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: "insufficient" | "limit" };

interface WalletContextValue {
  balances: Balances;
  transactions: Transaction[];
  hideBalance: boolean;
  toggleHideBalance: () => void;
  transfer: (input: TransferInput) => TransferResult;
  pay: (input: PaymentInput) => TransferResult;
  getTransaction: (id: string) => Transaction | undefined;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function makeReference(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `BY-${ymd}-${rand}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balances, setBalances] = useState<Balances>(initialBalances);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("boyia.hideBalance");
    if (stored === "1") setHideBalance(true);
  }, []);

  const toggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      window.localStorage.setItem("boyia.hideBalance", prev ? "0" : "1");
      return !prev;
    });
  }, []);

  const debit = useCallback(
    (
      type: "transfer_out" | "payment",
      counterparty: string,
      amount: number,
      note?: string,
    ): TransferResult => {
      if (amount > BOYIA_CONFIG.transferLimitPerTx) {
        return { ok: false, error: "limit" };
      }
      if (amount > balances.available) {
        return { ok: false, error: "insufficient" };
      }
      const newAvailable = balances.available - amount;
      const transaction: Transaction = {
        id: `tx_${Date.now()}`,
        reference: makeReference(),
        type,
        status: "completed",
        amount: -amount,
        fee: 0,
        counterparty,
        note,
        dateIso: new Date().toISOString(),
        balanceAfter: newAvailable,
      };
      setBalances((prev) => ({ ...prev, available: prev.available - amount }));
      setTransactions((prev) => [transaction, ...prev]);
      return { ok: true, transaction };
    },
    [balances.available],
  );

  const transfer = useCallback(
    (input: TransferInput) => debit("transfer_out", input.recipientName, input.amount, input.note),
    [debit],
  );

  const pay = useCallback(
    (input: PaymentInput) => debit("payment", input.merchantName, input.amountBoyia, input.note),
    [debit],
  );

  const getTransaction = useCallback(
    (id: string) => transactions.find((tx) => tx.id === id),
    [transactions],
  );

  const value = useMemo(
    () => ({
      balances,
      transactions,
      hideBalance,
      toggleHideBalance,
      transfer,
      pay,
      getTransaction,
    }),
    [balances, transactions, hideBalance, toggleHideBalance, transfer, pay, getTransaction],
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
