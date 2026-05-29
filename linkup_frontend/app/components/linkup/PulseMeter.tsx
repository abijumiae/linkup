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
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/80 dark:hover:bg-brand-primary/10"
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
                <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {card.value}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {card.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
