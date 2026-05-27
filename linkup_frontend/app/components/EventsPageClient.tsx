"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Image, MapPin, Plus, Search, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createEvent,
  Event,
  EventsFilters,
  fetchEvents,
  joinEvent,
  leaveEvent,
} from "@/src/lib/events";
import { eventFilterOptions } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import EventCard from "./EventCard";

const categoryOptions = eventFilterOptions.filter(
  (option) => option !== "Date",
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50";

function HappeningsEmptyState({
  title,
  description,
  showCreateButton,
  onCreate,
}: {
  title: string;
  description: string;
  showCreateButton?: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-slate-900/60">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <CalendarDays className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {showCreateButton && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
        >
          <Plus className="h-4 w-4" />
          Create Happening
        </button>
      ) : null}
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/80">
      <div className="h-36 rounded-xl bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-9 w-full rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export default function EventsPageClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
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
    category: categoryOptions[0] ?? "Online",
    imageUrl: "",
  });

  function buildFilters(overrides?: Partial<EventsFilters>): EventsFilters {
    return {
      q: searchInput.trim() || undefined,
      location: locationInput.trim() || undefined,
      category: activeCategory ?? undefined,
      ...overrides,
    };
  }

  const loadEvents = useCallback(async (filters: EventsFilters) => {
    try {
      const data = await fetchEvents(filters);
      setEvents(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load happenings. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadEvents({});
      setIsLoading(false);
    }
    void init();
  }, [loadEvents]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadEvents(buildFilters());
    setIsLoading(false);
  };

  const handleCategoryFilter = async (category: string | null) => {
    setActiveCategory(category);
    setIsLoading(true);
    await loadEvents(buildFilters({ category: category ?? undefined }));
    setIsLoading(false);
  };

  const updateEventInList = (updated: Event) => {
    setEvents((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const handleJoin = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      const updated = await joinEvent(eventId);
      updateEventInList(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to join happening.",
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
        err instanceof ApiError ? err.message : "Unable to leave happening.",
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
        category: categoryOptions[0] ?? "Online",
        imageUrl: "",
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create happening.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && events.length === 0) {
    return <AuthLoadingScreen message="Loading happenings..." />;
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="mb-8 linkup-panel p-6 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                LinkUp Happenings
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Happenings
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Discover what&apos;s happening around your network.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
            >
              <Plus className="h-4 w-4" />
              Create Happening
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Search happenings..."
                />
              </div>
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/80">
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Filter by location"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-11 rounded-full border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {isLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryFilter(null)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeCategory === null
                  ? "border-violet-500/50 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-600"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              All
            </button>
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryFilter(category)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "border-violet-500/50 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-600"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {isLoading && events.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventSkeleton key={index} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <HappeningsEmptyState
            title="No happenings yet"
            description="Create the first happening and bring people together."
            showCreateButton
            onCreate={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Create Happening
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Bring people together with a new gathering on LinkUp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Happening title"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description
                </span>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  placeholder="What is this happening about?"
                  className={`${inputClass} resize-none`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Location
                </span>
                <input
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="Venue, city, or Online"
                  className={inputClass}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Start date
                  </span>
                  <input
                    required
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    End date (optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className={inputClass}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Image URL (optional)
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-950">
                  <Image className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    type="url"
                    placeholder="https://example.com/event.jpg"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </label>
              {createError ? (
                <p className="text-sm text-red-600 dark:text-red-300">
                  {createError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-sky-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create Happening"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
