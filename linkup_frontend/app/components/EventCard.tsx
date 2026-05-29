"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Tag,
  User,
  Users,
} from "lucide-react";
import { Event, formatEventDate } from "@/src/lib/events";

type EventCardProps = {
  event: Event;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  isUpdating?: boolean;
};

export default function EventCard({
  event,
  onJoin,
  onLeave,
  isUpdating = false,
}: EventCardProps) {
  const handleAttendance = () => {
    if (event.isOrganizer) return;
    if (event.isGoing) {
      onLeave?.(event.id);
    } else {
      onJoin?.(event.id);
    }
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-brand-primary/10 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 items-end bg-gradient-to-br from-brand-primary/15 via-slate-100 to-brand-secondary/10 p-5 dark:from-brand-primary/20 dark:via-brand-dark dark:to-brand-dark">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
              {event.category ?? "Happening"}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
              {event.title}
            </h3>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {event.imageUrl ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                {event.category ?? "Happening"}
              </span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
              {event.title}
            </h3>
          </>
        ) : null}

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {event.description}
        </p>

        <div className="mt-4 space-y-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
            {formatEventDate(event.startDate)}
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {event.location}
          </p>
          {event.category ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              {event.category}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <User className="h-3.5 w-3.5" />
            Organizer:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {event.organizer.name}
            </span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5 text-brand-primary dark:text-brand-secondary" />
            {event.attendeesCount}{" "}
            {event.attendeesCount === 1 ? "person" : "people"} going
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:border-brand-primary/40 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            View Details
          </Link>
          {event.isOrganizer ? (
            <span className="inline-flex flex-1 items-center justify-center rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-primary dark:text-brand-secondary">
              Your happening
            </span>
          ) : event.isGoing ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleAttendance}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isUpdating ? "Updating…" : "Going"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleAttendance}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:opacity-50"
            >
              {isUpdating ? "Joining…" : "I'm Going"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
