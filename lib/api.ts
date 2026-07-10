"use client";

/** Client HTTP de l'application utilisateur — parle à l'API Boyia. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ACCESS_KEY = "boyia.user.access";
const REFRESH_KEY = "boyia.user.refresh";
const PROFILE_KEY = "boyia.user.profile";

export interface SessionUser {
  publicId: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  verificationLevel: number;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function hasToken(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem(ACCESS_KEY));
}

export function saveSession(auth: AuthResult): void {
  window.localStorage.setItem(ACCESS_KEY, auth.accessToken);
  window.localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(auth.user));
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export class UserApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function rawFetch(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> },
  token: string | null,
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function toError(response: Response): Promise<UserApiError> {
  let message = `Erreur ${response.status}`;
  try {
    const data: { message?: string | string[] } = await response.json();
    if (data.message) {
      message = Array.isArray(data.message) ? data.message.join(" · ") : data.message;
    }
  } catch {
    // corps non JSON
  }
  return new UserApiError(message, response.status);
}

/**
 * Requête authentifiée avec rafraîchissement automatique du jeton :
 * sur 401, tente une fois POST /v1/auth/refresh puis rejoue la requête.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await rawFetch(path, options, window.localStorage.getItem(ACCESS_KEY));
    if (response.status === 401) {
      const refreshToken = window.localStorage.getItem(REFRESH_KEY);
      if (refreshToken) {
        const refreshed = await rawFetch(
          "/v1/auth/refresh",
          { method: "POST", body: { refreshToken } },
          null,
        );
        if (refreshed.ok) {
          const auth = (await refreshed.json()) as AuthResult;
          saveSession(auth);
          response = await rawFetch(path, options, auth.accessToken);
        } else {
          clearSession();
        }
      }
    }
  } catch {
    throw new UserApiError(
      "Connexion au serveur impossible. Vérifie ta connexion et que l'API est démarrée.",
      0,
    );
  }
  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}

/** Requête publique (sans jeton). */
export async function apiPublic<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await rawFetch(path, options, null);
  } catch {
    throw new UserApiError(
      "Connexion au serveur impossible. Vérifie ta connexion et que l'API est démarrée.",
      0,
    );
  }
  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}

// ---- Formes de réponses API ----

export interface ApiBalances {
  walletId: string;
  currencyCode: string;
  available: number;
  pending: number;
  promotional: number;
  blocked: number;
  indicativeFcfa: number;
  limits: { perTransfer: number; daily: number };
}

export interface ApiTransaction {
  id: string;
  reference: string;
  type: "transfer" | "reward" | "admin_grant" | "payment" | "reversal";
  status: string;
  direction: "in" | "out";
  amount: number;
  fee: number;
  note: string | null;
  counterparty: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiRecipient {
  firstName: string;
  lastName: string;
  username: string;
  phoneMasked: string;
  isMerchant: boolean;
  isNew: boolean;
}
