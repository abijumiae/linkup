"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createEvent,
  Event,
  fetchEvents,
  joinEvent,
  leaveEvent,
} from "@/src/lib/events";
import { eventFilterOptions } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import EventCard from "./EventCard";

export default function EventsPageClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    category: "Online",
    imageUrl: "",
  });

  const loadEvents = useCallback(
    async (filters?: { q?: string; category?: string }) => {
      try {
        const data = await fetchEvents(filters);
        setEvents(data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Unable to load events. Please try again.");
      }
    },
    [router],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadEvents();
      setIsLoading(false);
    }
    void init();
  }, [loadEvents]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadEvents({
      q: searchInput,
      category:
        activeCategory && activeCategory !== "Date"
          ? activeCategory
          : undefined,
    });
    setIsLoading(false);
  };

  const handleCategoryFilter = async (category: string | null) => {
    setActiveCategory(category);
    setIsLoading(true);
    await loadEvents({
      q: searchInput || undefined,
      category:
        category && category !== "Date" ? category : undefined,
    });
    setIsLoading(false);
  };

  const updateEventInList = (updated: Event) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updated.id ? updated : event)),
    );
  };

  const handleJoin = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      const updated = await joinEvent(eventId);
      updateEventInList(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to join event.",
      );
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleLeave = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      const updated = await leaveEvent(eventId);
      updateEventInList(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to leave event.",
      );
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await createEvent({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate
          ? new Date(form.endDate).toISOString()
          : undefined,
        category: form.category.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      setEvents((prev) => [
        created,
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        location: "",
        startDate: "",
        endDate: "",
        category: "Online",
        imageUrl: "",
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create event.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && events.length === 0) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                Events
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Find events and share your next experience
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
            >
              <Sparkles className="h-4 w-4" />
              Create event
            </button>
          </div>
          <form
            onSubmit={handleSearch}
            className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.2fr_0.9fr_0.9fr]"
          >
            <div className="relative rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 lg:col-span-1 xl:col-span-1 dark:border-white/10 dark:bg-slate-950/80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent pl-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Search events"
              />
            </div>
            {eventFilterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  handleCategoryFilter(
                    activeCategory === filter ? null : filter,
                  )
                }
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeCategory === filter
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {filter}
              </button>
            ))}
          </form>
        </div>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        {events.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            No upcoming events. Create the first one.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onJoin={handleJoin}
                onLeave={handleLeave}
                isUpdating={updatingEventId === event.id}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create event</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Description"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <input
                required
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Location"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs text-slate-600 dark:text-slate-400">
                    Start date
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-slate-600 dark:text-slate-400">
                    End date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400/50"
                  />
                </div>
              </div>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400/50"
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
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="Image URL (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              {createError && (
                <p className="text-sm text-red-600 dark:text-red-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Publish event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
