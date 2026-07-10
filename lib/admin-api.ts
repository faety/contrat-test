"use client";

/** Client HTTP de l'interface d'administration — parle à l'API NestJS. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "boyia.admin.token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function adminFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getAdminToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      "API injoignable. Démarre le backend : cd api && npm run dev (port 4000).",
      0,
    );
  }
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const data: { message?: string | string[] } = await response.json();
      if (data.message) {
        message = Array.isArray(data.message) ? data.message.join(" · ") : data.message;
      }
    } catch {
      // corps non JSON — on garde le message générique
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

// ---- Types des réponses API ----

export interface AdminDashboard {
  users: { total: number; active: number; verified: number; blocked: number };
  boyia: {
    emitted: number;
    inCirculation: number;
    fcfaPerBoyia: number;
    ledgerImbalance: number;
    ledgerBalanced: boolean;
  };
  transactions: { completed: number; volume: number; recent: AdminTransaction[] };
  featureFlags: Record<string, boolean>;
}

export interface AdminTransaction {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  note: string | null;
  reversalOfId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminUser {
  publicId: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  status: string;
  verificationLevel: number;
  balance: number;
  createdAt: string;
}

export interface AdminRewardRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  rewardAmount: number;
  budget: number;
  spentAmount: number;
  status: "active" | "paused" | "ended";
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
