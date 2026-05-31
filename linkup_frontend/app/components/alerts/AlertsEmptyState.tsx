"use client";

import { Bell } from "lucide-react";

type AlertsEmptyStateProps = {
  variant: "all" | "unread" | "filter";
};

export default function AlertsEmptyState({ variant }: AlertsEmptyStateProps) {
  if (variant === "unread") {
    return (
      <div className="linkup-panel border-dashed p-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No unread alerts.
        </p>
      </div>
    );
  }

  if (variant === "filter") {
    return (
      <div className="linkup-panel border-dashed p-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No alerts match this filter. Try another category.
        </p>
      </div>
    );
  }

  return (
    <div className="linkup-panel border-dashed p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
        <Bell className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        You&apos;re all caught up.
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
        New boosts, replies, chats, and updates will appear here.
      </p>
    </div>
  );
}
