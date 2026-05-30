"use client";

import Link from "next/link";
import { CalendarDays, Flame, MapPin, Sparkles, Users } from "lucide-react";
import { Event, formatEventDate } from "@/src/lib/events";
import { getEventTimingStatus } from "@/src/lib/happeningsConstants";

type HappeningsSidebarProps = {
  trending: Event[];
  upcoming: Event[];
};

export default function HappeningsSidebar({
  trending,
  upcoming,
}: HappeningsSidebarProps) {
  return (
    <aside className="space-y-5">
      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Trending events
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {trending.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Trending happenings will appear here.
            </li>
          ) : (
            trending.map((event, index) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="flex gap-3 rounded-xl border border-slate-200/90 p-2.5 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:hover:bg-brand-primary/10"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary dark:text-brand-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.attendeesCount} interested
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Upcoming near you
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              No upcoming events yet.
            </li>
          ) : (
            upcoming.slice(0, 4).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="block rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {event.title}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </p>
                  <p className="text-xs text-brand-primary dark:text-brand-secondary">
                    {formatEventDate(event.startDate)}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Suggested communities
          </h2>
        </div>
        <div className="mt-4 space-y-2">
          <Link
            href="/groups"
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 px-3 py-2.5 text-sm transition hover:border-brand-primary/30 dark:border-white/10"
          >
            <Sparkles className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            Explore Hubs
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 px-3 py-2.5 text-sm transition hover:border-brand-primary/30 dark:border-white/10"
          >
            <Users className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            Discover hosts
          </Link>
        </div>
      </section>
    </aside>
  );
}
