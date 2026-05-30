"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type TrendingCardProps = {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  accent?: "primary" | "secondary" | "pink" | "amber" | "emerald";
};

const accentStyles = {
  primary:
    "from-brand-primary/15 to-brand-primary/5 text-brand-primary dark:text-brand-secondary",
  secondary:
    "from-brand-secondary/15 to-brand-secondary/5 text-brand-secondary",
  pink: "from-pink-500/15 to-pink-500/5 text-pink-600 dark:text-pink-300",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300",
  emerald:
    "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
};

export default function DiscoverTrendingCard({
  title,
  description,
  cta,
  href,
  icon: Icon,
  accent = "primary",
}: TrendingCardProps) {
  return (
    <div className="linkup-card flex h-full flex-col p-5 transition hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/10">
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accentStyles[accent]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <Link
        href={href}
        className="linkup-btn-secondary mt-4 inline-flex min-h-[40px] w-full text-xs sm:w-auto"
      >
        {cta}
      </Link>
    </div>
  );
}
