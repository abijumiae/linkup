import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type PulseMeterStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
};

type PulseMeterProps = {
  stats: PulseMeterStat[];
};

export default function PulseMeter({ stats }: PulseMeterProps) {
  return (
    <section className="linkup-panel p-5 sm:p-6">
      <p className="linkup-eyebrow">Pulse Meter</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        What&apos;s moving today
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-brand-primary/35 hover:shadow-lg hover:shadow-brand-primary/10 active:scale-[0.99] dark:border-white/10 dark:from-brand-dark/90 dark:to-brand-dark/60 dark:hover:border-brand-secondary/30 dark:hover:shadow-brand-secondary/10"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-primary/0 via-brand-primary/70 to-brand-secondary/0 opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary/15 dark:bg-brand-primary/15 dark:text-brand-secondary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {card.value}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-snug text-slate-700 dark:text-slate-300">
                {card.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
