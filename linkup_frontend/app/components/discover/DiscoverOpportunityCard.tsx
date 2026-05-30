"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type DiscoverOpportunityCardProps = {
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

export default function DiscoverOpportunityCard({
  title,
  subtitle,
  meta,
  href,
  cta,
  icon: Icon,
}: DiscoverOpportunityCardProps) {
  return (
    <Link
      href={href}
      className="linkup-card group block p-4 transition hover:border-brand-primary/30 hover:shadow-md hover:shadow-brand-primary/10 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary/15 dark:text-brand-secondary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
          {meta ? (
            <p className="mt-2 text-xs font-medium text-brand-primary dark:text-brand-secondary">
              {meta}
            </p>
          ) : null}
          <span className="mt-3 inline-flex text-xs font-semibold text-brand-primary dark:text-brand-secondary">
            {cta} →
          </span>
        </div>
      </div>
    </Link>
  );
}
