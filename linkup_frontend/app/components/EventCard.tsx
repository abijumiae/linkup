"use client";

import Link from "next/link";
import { memo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Radio,
  Share2,
  Star,
  User,
  Video,
} from "lucide-react";
import { Event, formatEventDate } from "@/src/lib/events";
import {
  getEventTimingStatus,
  isOnlineLocation,
} from "@/src/lib/happeningsConstants";
import {
  isEventInterested,
  toggleEventInterested,
} from "@/src/lib/happeningsInterests";

type EventCardProps = {
  event: Event;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  isUpdating?: boolean;
};

function EventCard({
  event,
  onJoin,
  onLeave,
  isUpdating = false,
}: EventCardProps) {
  const [interested, setInterested] = useState(() =>
    isEventInterested(event.id),
  );
  const timing = getEventTimingStatus(event);
  const online = isOnlineLocation(event.location);

  const handleAttendance = () => {
    if (event.isOrganizer) return;
    if (event.isGoing) {
      onLeave?.(event.id);
    } else {
      onJoin?.(event.id);
    }
  };

  const handleInterested = () => {
    setInterested(toggleEventInterested(event.id));
  };

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/events/${event.id}`
        : `/events/${event.id}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <article className="group linkup-panel flex h-full flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-brand-primary/10">
      <Link href={`/events/${event.id}`} className="relative block">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[16/10] items-end bg-gradient-to-br from-brand-primary/15 via-slate-100 to-brand-secondary/10 p-5 dark:from-brand-primary/20 dark:via-brand-dark dark:to-brand-dark">
            <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
              {event.title}
            </h3>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {timing === "live" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
              <Radio className="h-3 w-3" />
              Live
            </span>
          ) : null}
          <span className="rounded-full bg-brand-primary/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
            {event.category ?? "Happening"}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {event.imageUrl ? (
          <Link href={`/events/${event.id}`}>
            <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-brand-primary dark:text-white dark:group-hover:text-brand-secondary">
              {event.title}
            </h3>
          </Link>
        ) : null}

        <div className="mt-3 flex items-center gap-2.5">
          {event.organizer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.organizer.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-brand-dark"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
              <User className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {event.organizer.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              @{event.organizer.username}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
            {formatEventDate(event.startDate)}
          </p>
          <p className="inline-flex items-center gap-1.5">
            {online ? (
              <Video className="h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            {online ? "Online" : event.location}
          </p>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {event.attendeesCount}{" "}
          {event.attendeesCount === 1 ? "person" : "people"} going
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {event.isOrganizer ? (
            <span className="linkup-btn-secondary flex-1 min-h-[44px] cursor-default text-xs uppercase tracking-wide">
              Your event
            </span>
          ) : event.isGoing ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleAttendance}
              className="linkup-btn-secondary flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isUpdating ? "Updating…" : "Joined"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleAttendance}
              className="linkup-btn-primary min-h-[44px] flex-1"
            >
              {isUpdating ? "Joining…" : "Join"}
            </button>
          )}
          {!event.isOrganizer ? (
            <button
              type="button"
              onClick={handleInterested}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ${
                interested
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              }`}
            >
              <Star className={`h-4 w-4 ${interested ? "fill-current" : ""}`} />
              Interested
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Share event"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(EventCard);
