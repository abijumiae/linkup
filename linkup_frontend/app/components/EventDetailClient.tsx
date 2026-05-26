"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  deleteEvent,
  Event,
  EventAttendee,
  fetchEvent,
  fetchEventAttendees,
  formatEventDate,
  joinEvent,
  leaveEvent,
  updateEvent,
} from "@/src/lib/events";
import { eventFilterOptions } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";

type EventDetailClientProps = {
  eventId: string;
};

export default function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
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
      const [eventData, attendeesData] = await Promise.all([
        fetchEvent(eventId),
        fetchEventAttendees(eventId),
      ]);
      setEvent(eventData);
      setAttendees(attendeesData);
      setEditForm({
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        startDate: toLocalInput(eventData.startDate),
        endDate: eventData.endDate ? toLocalInput(eventData.endDate) : "",
        category: eventData.category ?? "Online",
        imageUrl: eventData.imageUrl ?? "",
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load event. Please try again.");
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
      const attendeesData = await fetchEventAttendees(eventId);
      setAttendees(attendeesData);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update attendance.",
      );
    } finally {
      setMembershipLoading(false);
    }
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
      setError(
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
      setError(
        err instanceof ApiError ? err.message : "Unable to delete event.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        {error ?? "Event not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/events"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-xl backdrop-blur-xl">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt=""
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="h-48 bg-gradient-to-br from-violet-500/20 via-slate-900 to-slate-950" />
          )}

          <div className="p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
              {event.category ?? "Event"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {event.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                <CalendarDays className="h-4 w-4 text-violet-300" />
                {formatEventDate(event.startDate)}
              </span>
              {event.endDate && (
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Ends {formatEventDate(event.endDate)}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                <MapPin className="h-4 w-4 text-slate-400" />
                {event.location}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                <Users className="h-4 w-4 text-violet-300" />
                {event.attendeesCount} going
              </span>
            </div>

            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {event.description}
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Organizer
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {event.organizer.name}
              </p>
              <p className="text-sm text-slate-400">
                @{event.organizer.username}
              </p>
            </div>

            {error && (
              <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {event.isOrganizer ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={membershipLoading}
                  onClick={handleMembership}
                  className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
                >
                  {membershipLoading
                    ? "Updating…"
                    : event.isGoing
                      ? "Leave event"
                      : "Join event"}
                </button>
              )}
            </div>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-white">Attendees</h2>
              {attendees.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No attendees yet. Be the first to join.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {attendees.map((attendee) => (
                    <li
                      key={attendee.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {attendee.user.name}
                        </p>
                        <p className="text-sm text-slate-400">
                          @{attendee.user.username}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-violet-200">
                        {attendee.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </article>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit event</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                required
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  type="datetime-local"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startDate: e.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                />
                <input
                  type="datetime-local"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endDate: e.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </div>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {eventFilterOptions
                  .filter((option) => option !== "Date")
                  .map((option) => (
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
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
