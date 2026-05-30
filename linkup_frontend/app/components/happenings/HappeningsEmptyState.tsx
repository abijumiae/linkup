"use client";

import Link from "next/link";
import { CalendarDays, Compass } from "lucide-react";

type HappeningsEmptyStateProps = {
  onCreate?: () => void;
};

export default function HappeningsEmptyState({
  onCreate,
}: HappeningsEmptyStateProps) {
  return (
    <div className="linkup-panel border-dashed p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
        <CalendarDays className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        No Happenings yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Explore Discover or create your first event.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/explore"
          className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2"
        >
          <Compass className="h-4 w-4" />
          Explore Discover
        </Link>
        {onCreate ? (
          <button type="button" onClick={onCreate} className="linkup-btn-primary min-h-[44px]">
            Create Event
          </button>
        ) : null}
      </div>
    </div>
  );
}
