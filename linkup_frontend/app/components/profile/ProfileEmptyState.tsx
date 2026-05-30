"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

type ProfileEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: ProfileEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/90 bg-gradient-to-br from-white to-slate-50/80 p-8 text-center dark:border-white/15 dark:from-brand-dark/80 dark:to-brand-dark/60 sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="linkup-btn-primary mt-5 inline-flex min-h-[44px]">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
