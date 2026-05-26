"use client";

import Link from "next/link";
import { CalendarDays, Globe2, MapPin, Users } from "lucide-react";
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
  const isOnline =
    event.category?.toLowerCase() === "online" ||
    event.location.toLowerCase().includes("online");

  const handleAttendance = () => {
    if (event.isOrganizer) return;
    if (event.isGoing) {
      onLeave?.(event.id);
    } else {
      onJoin?.(event.id);
    }
  };

  return (
    <article className="card-float flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85 shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/20">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-44 bg-gradient-to-br from-violet-500/15 via-sky-500/10 to-cyan-300/10 p-5">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-slate-950/60 p-4 text-white">
            <div className="text-sm uppercase tracking-[0.25em] text-violet-200/70">
              {event.category ?? "Event"}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{event.title}</h3>
              <p className="mt-2 text-sm text-slate-300">
                by {event.organizer.name}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {event.imageUrl && (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-violet-300/80">
              {event.category ?? "Event"}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {event.title}
            </h3>
          </>
        )}
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
          {event.description}
        </p>
        <div className="mt-5 grid gap-3">
          <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4 shrink-0 text-violet-300" />
            {formatEventDate(event.startDate)}
          </div>
          <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
            {isOnline ? (
              <Globe2 className="h-4 w-4 shrink-0 text-cyan-300" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            {event.location}
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4 text-violet-300" />
            {event.attendeesCount}{" "}
            {event.attendeesCount === 1 ? "attendee" : "attendees"}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex flex-1 justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          >
            View details
          </Link>
          {!event.isOrganizer && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleAttendance}
              className="inline-flex flex-1 justify-center rounded-full bg-violet-500 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
            >
              {event.isGoing ? "Going" : "Join"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
