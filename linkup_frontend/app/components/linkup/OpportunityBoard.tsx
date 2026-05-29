import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type OpportunityItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type OpportunityBoardProps = {
  items: OpportunityItem[];
};

export default function OpportunityBoard({ items }: OpportunityBoardProps) {
  return (
    <div className="linkup-panel p-5">
      <p className="linkup-eyebrow">Opportunity Board</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Social + opportunities
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Market, work, and happenings in one place.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/80 dark:hover:bg-brand-primary/10"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {card.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
