"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageSquare,
  Pencil,
  Radio,
  Share2,
  Star,
  Trash2,
  User,
  Users,
  Video,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  deleteEvent,
  Event,
  EventAttendee,
  fetchEvent,
  fetchEventAttendeesSafe,
  fetchEventsSafe,
  formatEventDate,
  joinEvent,
  leaveEvent,
  updateEvent,
} from "@/src/lib/events";
import {
  getEventTimingStatus,
  HAPPENINGS_CATEGORIES,
  isOnlineLocation,
  parseTagsFromDescription,
} from "@/src/lib/happeningsConstants";
import {
  isEventInterested,
  toggleEventInterested,
} from "@/src/lib/happeningsInterests";
import EventCard from "./EventCard";

type EventDetailClientProps = {
  eventId: string;
};

function DetailSkeleton() {
  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="linkup-panel animate-pulse overflow-hidden p-0">
          <div className="h-64 bg-slate-200 dark:bg-white/10" />
          <div className="space-y-4 p-8">
            <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [interested, setInterested] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    category: "Online",
    imageUrl: "",
  });

  const toLocalInput = (dateStr: string) => {
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  };

  const load = useCallback(async () => {
    try {
      const [eventData, attendeesResult, relatedResult] = await Promise.all([
        fetchEvent(eventId),
        fetchEventAttendeesSafe(eventId),
        fetchEventsSafe({
          category: undefined,
          timeframe: "all",
          limit: 6,
        }),
      ]);

      setEvent(eventData);
      setAttendees(attendeesResult.attendees);
      setInterested(isEventInterested(eventId));
      setRelatedEvents(
        relatedResult.items.filter((item) => item.id !== eventId).slice(0, 3),
      );
      setEditForm({
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        startDate: toLocalInput(eventData.startDate),
        endDate: eventData.endDate ? toLocalInput(eventData.endDate) : "",
        category: eventData.category ?? "Online",
        imageUrl: eventData.imageUrl ?? "",
      });
      setWarning(relatedResult.warning);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setWarning("Could not load this event. Please try again.");
    }
  }, [eventId, router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  const handleMembership = async () => {
    if (!event || event.isOrganizer) return;

    setMembershipLoading(true);
    try {
      const updated = event.isGoing
        ? await leaveEvent(eventId)
        : await joinEvent(eventId);
      setEvent(updated);
      const attendeesResult = await fetchEventAttendeesSafe(eventId);
      setAttendees(attendeesResult.attendees);
    } catch (err) {
      setWarning(
        err instanceof ApiError ? err.message : "Unable to update attendance.",
      );
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleInterested = () => {
    setInterested(toggleEventInterested(eventId));
  };

  const handleShare = async () => {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
        return;
      } catch {
        // fall through
      }
    }

    await navigator.clipboard.writeText(url);
  };

  const handleEdit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event) return;

    setIsSaving(true);
    try {
      const updated = await updateEvent(event.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: editForm.endDate
          ? new Date(editForm.endDate).toISOString()
          : undefined,
        category: editForm.category.trim() || undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      setEvent(updated);
      setShowEditModal(false);
    } catch (err) {
      setWarning(
        err instanceof ApiError ? err.message : "Unable to update event.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Delete this event permanently?")) return;

    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      router.push("/events");
    } catch (err) {
      setWarning(
        err instanceof ApiError ? err.message : "Unable to delete event.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!event) {
    return (
      <div className="linkup-page flex min-h-[50vh] items-center justify-center px-4">
        <div className="linkup-panel max-w-md p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {warning ?? "Event not found."}
          </p>
          <Link href="/events" className="linkup-btn-secondary mt-4 inline-flex min-h-[44px]">
            Back to Happenings
          </Link>
        </div>
      </div>
    );
  }

  const timing = getEventTimingStatus(event);
  const online = isOnlineLocation(event.location);
  const { body: descriptionBody, tags } = parseTagsFromDescription(
    event.description,
  );

  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href="/events"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Happenings
        </Link>

        {warning ? (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <article className="linkup-panel overflow-hidden p-0">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imageUrl}
                alt=""
                className="h-64 w-full object-cover sm:h-72"
              />
            ) : (
              <div className="h-48 bg-gradient-to-br from-brand-primary/20 via-brand-dark to-brand-dark sm:h-64" />
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {timing === "live" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-semibold text-white">
                    <Radio className="h-3 w-3" />
                    Live now
                  </span>
                ) : null}
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                  {event.category ?? "Happening"}
                </span>
              </div>

              <h1 className="linkup-title mt-3 text-3xl">{event.title}</h1>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 dark:border-white/10">
                  <CalendarDays className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                  {formatEventDate(event.startDate)}
                </span>
                {event.endDate ? (
                  <span className="rounded-full border border-slate-200 px-3 py-1.5 dark:border-white/10">
                    Ends {formatEventDate(event.endDate)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 dark:border-white/10">
                  {online ? (
                    <Video className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                  ) : (
                    <MapPin className="h-4 w-4 text-slate-400" />
                  )}
                  {online ? "Online" : event.location}
                </span>
              </div>

              {tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                {descriptionBody}
              </p>

              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-brand-dark/60">
                {event.organizer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                    <User className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Host
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {event.organizer.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    @{event.organizer.username}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {event.isOrganizer ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-50 dark:text-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={membershipLoading}
                      onClick={handleMembership}
                      className="linkup-btn-primary min-h-[44px]"
                    >
                      {membershipLoading
                        ? "Updating…"
                        : event.isGoing
                          ? "Leave event"
                          : "Join event"}
                    </button>
                    <button
                      type="button"
                      onClick={handleInterested}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                        interested
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      }`}
                    >
                      <Star className={`h-4 w-4 ${interested ? "fill-current" : ""}`} />
                      Interested
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>

              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
                  Participants ({event.attendeesCount})
                </h2>
                {attendees.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    Be the first to join this event.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 flex -space-x-2">
                      {attendees.slice(0, 8).map((attendee) =>
                        attendee.user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={attendee.id}
                            src={attendee.user.avatarUrl}
                            alt=""
                            title={attendee.user.name}
                            className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-brand-dark"
                          />
                        ) : (
                          <span
                            key={attendee.id}
                            title={attendee.user.name}
                            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-brand-primary/10 text-brand-primary dark:border-brand-dark dark:text-brand-secondary"
                          >
                            <User className="h-4 w-4" />
                          </span>
                        ),
                      )}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {attendees.slice(0, 6).map((attendee) => (
                        <li
                          key={attendee.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200/90 px-4 py-2.5 dark:border-white/10"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {attendee.user.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              @{attendee.user.username}
                            </p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                            {attendee.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="mt-10 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-brand-dark/40">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <MessageSquare className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
                  Discussion
                </h2>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  Event comments are coming soon. Share your thoughts with hosts and attendees in a future update.
                </p>
              </section>
            </div>
          </article>

          <aside className="space-y-5">
            <section className="linkup-panel p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Related events
              </h2>
              {relatedEvents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  More events will show up here soon.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {relatedEvents.map((related) => (
                    <Link
                      key={related.id}
                      href={`/events/${related.id}`}
                      className="block rounded-xl border border-slate-200/90 p-3 transition hover:border-brand-primary/30 dark:border-white/10"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {related.title}
                      </p>
                      <p className="mt-1 text-xs text-brand-primary dark:text-brand-secondary">
                        {formatEventDate(related.startDate)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

        {relatedEvents.length > 0 ? (
          <section className="mt-10 lg:hidden">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              Related events
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedEvents.map((related) => (
                <EventCard key={related.id} event={related} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Edit event
            </h2>
            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <input
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <input
                required
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  type="datetime-local"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
                />
                <input
                  type="datetime-local"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
                />
              </div>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              >
                {HAPPENINGS_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                value={editForm.imageUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, imageUrl: e.target.value })
                }
                placeholder="Image URL"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="linkup-btn-primary w-full min-h-[44px] disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
