"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";

type AlertToastProps = {
  message: string;
  href?: string;
  onDismiss: () => void;
};

export default function AlertToast({
  message,
  href = "/notifications",
  onDismiss,
}: AlertToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[70] flex justify-center px-4 sm:top-[calc(env(safe-area-inset-top,0px)+5rem)]">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand-primary/20 bg-white/95 px-4 py-3 shadow-xl shadow-slate-950/10 backdrop-blur dark:border-brand-primary/30 dark:bg-brand-dark/95">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
            New alert from LinkUp
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
            {message}
          </p>
          <Link
            href={href}
            className="mt-2 inline-flex text-xs font-semibold text-brand-primary hover:underline dark:text-brand-secondary"
            onClick={onDismiss}
          >
            View alerts
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dismiss alert toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
