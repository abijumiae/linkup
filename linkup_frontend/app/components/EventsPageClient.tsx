"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Search } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  Event,
  EventsFilters,
  fetchEventsSafe,
  joinEvent,
  leaveEvent,
} from "@/src/lib/events";
import {
  getEventTimeframeParam,
  HAPPENINGS_CATEGORIES,
  HAPPENINGS_TIME_TABS,
  HappeningsTimeTab,
} from "@/src/lib/happeningsConstants";
import EventCard from "./EventCard";
import CreateEventModal from "./happenings/CreateEventModal";
import HappeningsEmptyState from "./happenings/HappeningsEmptyState";
import HappeningsSidebar from "./happenings/HappeningsSidebar";
import {
  HappeningsCardSkeleton,
  HappeningsHeaderSkeleton,
} from "./happenings/HappeningsSkeleton";

export default function EventsPageClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [listPage, setListPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [activeTimeTab, setActiveTimeTab] = useState<HappeningsTimeTab>("All");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  function buildFilters(): EventsFilters {
    return {
      q: searchInput.trim() || undefined,
      location: locationInput.trim() || undefined,
      category: activeCategory ?? undefined,
      timeframe: getEventTimeframeParam(activeTimeTab),
    };
  }

  const loadEvents = useCallback(
    async (filters: EventsFilters, page = 1, append = false) => {
      try {
        const data = await fetchEventsSafe({ ...filters, page, limit: 20 });
        setEvents((current) =>
          append ? [...current, ...data.items] : data.items,
        );
        setListPage(page);
        setHasMore(data.hasMore);
        setWarning(data.warning);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setWarning("Happenings are warming up. Try again shortly.");
      }
    },
    [router],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadEvents(buildFilters());
      setIsLoading(false);
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimeTab, activeCategory, loadEvents]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadEvents(buildFilters());
    setIsLoading(false);
  };

  const handleTimeTab = (tab: HappeningsTimeTab) => {
    setActiveTimeTab(tab);
  };

  const handleCategoryFilter = (category: string | null) => {
    setActiveCategory(category);
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
      setWarning(
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
      setWarning(
        err instanceof ApiError ? err.message : "Unable to leave event.",
      );
    } finally {
      setUpdatingEventId(null);
    }
  };

  const sidebarData = useMemo(() => {
    const sortedByAttendees = [...events].sort(
      (a, b) => b.attendeesCount - a.attendeesCount,
    );
    const upcoming = [...events]
      .filter((event) => new Date(event.startDate).getTime() > Date.now())
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

    return {
      trending: sortedByAttendees.slice(0, 5),
      upcoming: upcoming.slice(0, 5),
    };
  }, [events]);

  if (isLoading && events.length === 0) {
    return (
      <div className="linkup-page">
        <div className="linkup-container-wide">
          <HappeningsHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <HappeningsCardSkeleton key={index} />
              ))}
            </div>
            <div className="hidden lg:block">
              <HappeningsHeaderSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="mb-8 linkup-panel p-6 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="linkup-eyebrow">LinkUp Community</p>
              <h1 className="linkup-title mt-2">Happenings</h1>
              <p className="linkup-subtitle mt-2 max-w-2xl">
                Explore what&apos;s trending, live, and upcoming across LinkUp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="linkup-btn-primary inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Event
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Search events, hosts, topics…"
                />
              </div>
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/80">
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
                className="linkup-btn-secondary min-h-[44px] disabled:opacity-60"
              >
                {isLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>

          <div className="linkup-chip-row mt-4 -mx-1 overflow-x-auto px-1 pb-1">
            {HAPPENINGS_TIME_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTimeTab(tab)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTimeTab === tab
                    ? "border-brand-primary/50 bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="linkup-chip-row mt-3 -mx-1 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => handleCategoryFilter(null)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeCategory === null
                  ? "border-brand-primary/50 bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              All categories
            </button>
            {HAPPENINGS_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryFilter(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "border-brand-primary/50 bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        {warning ? (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {isLoading && events.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <HappeningsCardSkeleton key={index} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <HappeningsEmptyState onCreate={() => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2">
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
                {hasMore ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingMore(true);
                        void loadEvents(
                          buildFilters(),
                          listPage + 1,
                          true,
                        ).finally(() => setLoadingMore(false));
                      }}
                      disabled={loadingMore}
                      className="linkup-btn-secondary min-h-[44px] disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : "Load more events"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="lg:order-none order-last">
            <HappeningsSidebar
              trending={sidebarData.trending}
              upcoming={sidebarData.upcoming}
            />
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(created) => {
          setEvents((prev) => [
            created,
            ...prev.filter((item) => item.id !== created.id),
          ]);
        }}
      />
    </div>
  );
}
