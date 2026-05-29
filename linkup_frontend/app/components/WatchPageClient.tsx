"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Play, Search, Users } from "lucide-react";
import WatchVideoCard from "@/src/components/WatchVideoCard";
import {
  fetchContinueWatching,
  fetchWatchVideos,
  getWatchQueryParams,
  mergeWithDemoVideos,
  WATCH_CATEGORIES,
  WatchCategory,
  WatchVideo,
} from "@/src/lib/watch";

function WatchSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        {eyebrow ? <p className="linkup-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function VideoSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-brand-dark/80">
      <div className="aspect-video bg-slate-200 dark:bg-white/10" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function WatchPageClient() {
  const [videos, setVideos] = useState<WatchVideo[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchVideo[]>([]);
  const [activeCategory, setActiveCategory] = useState<WatchCategory>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setIsLoading(true);

    try {
      const filters = {
        ...getWatchQueryParams(activeCategory),
        search: searchQuery || undefined,
      };

      const [fetched, progressList] = await Promise.all([
        fetchWatchVideos(filters).catch(() => [] as WatchVideo[]),
        fetchContinueWatching().catch(() => [] as WatchVideo[]),
      ]);

      const merged = mergeWithDemoVideos(fetched);
      setVideos(merged);
      setUsingDemo(fetched.length === 0);
      setContinueWatching(progressList);
    } catch {
      setVideos(DEMO_WATCH_VIDEOS_FALLBACK);
      setUsingDemo(true);
      setContinueWatching([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function handleBoost(video: WatchVideo) {
    setNotice(`Boosted "${video.title}" — social boosts are coming soon.`);
  }

  function handleShare(video: WatchVideo) {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/watch/${video.id}`
        : `/watch/${video.id}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: video.title, url }).catch(() => {
        void navigator.clipboard?.writeText(url);
        setNotice("Link copied to clipboard.");
      });
      return;
    }

    void navigator.clipboard?.writeText(url);
    setNotice("Link copied to clipboard.");
  }

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const featured = videos[0] ?? null;
  const freshDrops = videos.slice(1, 5);
  const creatorShows = videos.filter(
    (video) => video.type === "series" || video.category === "Shows",
  );
  const trending = [...videos]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const hasVideos = videos.length > 0;

  const filteredEmpty = useMemo(
    () => !isLoading && !hasVideos && !usingDemo,
    [hasVideos, isLoading, usingDemo],
  );

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide max-w-[1760px] space-y-8">
        <header className="linkup-panel p-6 sm:p-7">
          <p className="linkup-eyebrow">LinkUp Watch</p>
          <h1 className="linkup-title mt-3">Watch</h1>
          <p className="linkup-subtitle">
            Stream creator stories, shows, podcasts, and live drops inside LinkUp.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="linkup-input-shell relative mt-5 max-w-xl rounded-full py-2.5 pl-12"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="linkup-input"
              placeholder="Search videos..."
            />
          </form>

          <div className="-mx-1 mt-4 overflow-x-auto pb-1">
            <div className="flex min-w-min gap-2 px-1">
              {WATCH_CATEGORIES.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-brand-primary/30 hover:text-brand-primary dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300 dark:hover:text-brand-secondary"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {notice ? (
          <p className="rounded-3xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
            {notice}
          </p>
        ) : null}

        {usingDemo && hasVideos ? (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400">
            Showing sample picks while creator drops roll in.
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <VideoSkeleton key={`watch-skeleton-${index}`} />
            ))}
          </div>
        ) : filteredEmpty ? (
          <div className="linkup-empty p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
              <Play className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
              No videos yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Watch drops will appear here soon.
            </p>
            <Link
              href="/home"
              className="mt-5 inline-flex rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
            >
              Explore Pulse
            </Link>
          </div>
        ) : (
          <>
            {continueWatching.length > 0 ? (
              <WatchSection title="Continue Watching" eyebrow="Pick up where you left off">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {continueWatching.map((video) => (
                    <WatchVideoCard
                      key={`continue-${video.id}`}
                      video={video}
                      onBoost={handleBoost}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </WatchSection>
            ) : null}

            {featured ? (
              <WatchSection title="Featured Picks" eyebrow="Trending Now">
                <WatchVideoCard
                  video={featured}
                  featured
                  onBoost={handleBoost}
                  onShare={handleShare}
                />
              </WatchSection>
            ) : null}

            {freshDrops.length > 0 ? (
              <WatchSection title="Fresh Drops">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {freshDrops.map((video) => (
                    <WatchVideoCard
                      key={video.id}
                      video={video}
                      onBoost={handleBoost}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </WatchSection>
            ) : null}

            {creatorShows.length > 0 ? (
              <WatchSection title="Creator Shows">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {creatorShows.map((video) => (
                    <WatchVideoCard
                      key={`show-${video.id}`}
                      video={video}
                      onBoost={handleBoost}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </WatchSection>
            ) : null}

            {trending.length > 0 ? (
              <WatchSection title="Trending Now">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {trending.map((video) => (
                    <WatchVideoCard
                      key={`trend-${video.id}`}
                      video={video}
                      onBoost={handleBoost}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </WatchSection>
            ) : null}

            <section className="linkup-panel overflow-hidden p-6 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 text-brand-primary dark:text-brand-secondary">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="linkup-eyebrow">Watch Together</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                      Watch Together
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                      Live watch rooms with friends are coming soon.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400"
                >
                  Coming Soon
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const DEMO_WATCH_VIDEOS_FALLBACK = mergeWithDemoVideos([]);
