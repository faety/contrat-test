"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-ink-300 dark:disabled:bg-ink-700",
  secondary:
    "bg-ink-100 text-ink-900 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700",
  ghost:
    "bg-transparent text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-ink-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-ink-200/70 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: "brand" | "green" | "neutral" | "amber";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    neutral: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink-700 dark:text-ink-300"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-500 dark:text-ink-400">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses =
  "w-full min-h-12 rounded-2xl border border-ink-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-500/30 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/** Logo Boyia : pastille dégradée avec le symbole ʙ. */
export function BoyiaLogo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 font-black text-white shadow-md"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      ʙ
    </span>
  );
}
