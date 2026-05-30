"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import DropMomentModal from "@/src/components/DropMomentModal";
import MomentViewer from "@/src/components/MomentViewer";
import MomentsStrip from "@/src/components/MomentsStrip";
import WatchVideoCard from "@/src/components/WatchVideoCard";
import type { MomentGroup } from "@/src/lib/moments";
import { fetchMomentsFeedSafe } from "@/src/lib/moments";
import {
  fetchContinueWatchingSafe,
  fetchWatchVideosSafe,
  getWatchQueryParams,
  mergeWithDemoVideos,
  WATCH_CATEGORIES,
  WatchCategory,
  WatchVideo,
  watchWarningFromError,
} from "@/src/lib/watch";
import VideoPlayerModal from "./watch/VideoPlayerModal";
import WatchEmptyState from "./watch/WatchEmptyState";
import WatchSidebar from "./watch/WatchSidebar";
import {
  WatchCardSkeleton,
  WatchHeaderSkeleton,
  WatchMomentsSkeleton,
} from "./watch/WatchSkeleton";

const PAGE_SIZE = 12;

export default function WatchPageClient() {
  const router = useRouter();
  const currentUserId = getCurrentUser()?.id ?? null;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<WatchVideo[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchVideo[]>([]);
  const [momentGroups, setMomentGroups] = useState<MomentGroup[]>([]);
  const [activeCategory, setActiveCategory] = useState<WatchCategory>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<WatchVideo | null>(null);
  const [showDropMoment, setShowDropMoment] = useState(false);
  const [momentViewerIndex, setMomentViewerIndex] = useState<number | null>(
    null,
  );

  const loadVideos = useCallback(async () => {
    setIsLoading(true);

    try {
      const filters = {
        ...getWatchQueryParams(activeCategory),
        search: searchQuery || undefined,
      };

      const [fetchedResult, progressResult, momentsResult] = await Promise.all([
        fetchWatchVideosSafe(filters),
        fetchContinueWatchingSafe(),
        fetchMomentsFeedSafe(),
      ]);

      const usePreview = !fetchedResult.live;
      const displayVideos = usePreview
        ? mergeWithDemoVideos(fetchedResult.items)
        : fetchedResult.items;

      setVideos(displayVideos);
      setUsingDemo(usePreview && displayVideos.length > 0);
      setContinueWatching(progressResult.items);
      setMomentGroups(momentsResult.groups);
      setVisibleCount(PAGE_SIZE);

      const apiWarning =
        fetchedResult.warning ??
        progressResult.warning ??
        momentsResult.warning;

      setWarning(
        apiWarning && usePreview && displayVideos.length > 0
          ? `${apiWarning} Preview picks are available below.`
          : apiWarning,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      const previewVideos = mergeWithDemoVideos([]);
      setVideos(previewVideos);
      setUsingDemo(previewVideos.length > 0);
      setContinueWatching([]);
      setMomentGroups([]);
      setWarning(
        previewVideos.length > 0
          ? "Live catalog unavailable. Preview picks are available below."
          : watchWarningFromError(err),
      );
    } finally {
      setIsLoading(false);
      setMomentsLoading(false);
    }
  }, [activeCategory, searchQuery, router]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) =>
            Math.min(count + PAGE_SIZE, videos.length),
          );
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, videos.length]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
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

  function handleComment(video: WatchVideo) {
    setNotice(`Comments for "${video.title}" are coming soon.`);
  }

  const sidebarData = useMemo(() => {
    const sortedByViews = [...videos].sort(
      (a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0),
    );
    const newReleases = [...videos].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      trending: sortedByViews.slice(0, 6),
      newReleases: newReleases.slice(0, 6),
    };
  }, [videos]);

  const visibleVideos = videos.slice(0, visibleCount);
  const hasVideos = videos.length > 0;
  const filteredEmpty = !isLoading && !hasVideos && !usingDemo;

  if (isLoading && videos.length === 0) {
    return (
      <div className="linkup-page">
        <div className="linkup-container-wide max-w-[1760px]">
          <WatchHeaderSkeleton />
          <WatchMomentsSkeleton />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <WatchCardSkeleton key={index} />
              ))}
            </div>
            <div className="hidden lg:block">
              <WatchHeaderSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide max-w-[1760px]">
        <header className="mb-6 linkup-panel p-6 sm:p-7">
          <p className="linkup-eyebrow">LinkUp Media</p>
          <h1 className="linkup-title mt-2">Watch</h1>
          <p className="linkup-subtitle mt-2 max-w-2xl">
            Watch trending videos, stories, and creative moments.
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
              placeholder="Search videos, creators, shows…"
            />
          </form>

          <div className="linkup-chip-row mt-4 -mx-1 overflow-x-auto px-1 pb-1">
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
                      : "border border-slate-200 bg-white text-slate-700 hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </header>

        <MomentsStrip
          groups={momentGroups}
          currentUserId={currentUserId}
          onDropMoment={() => setShowDropMoment(true)}
          onOpenGroup={setMomentViewerIndex}
          isLoading={momentsLoading}
        />

        {warning ? (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        {notice ? (
          <p className="mb-6 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
            {notice}
          </p>
        ) : null}

        {usingDemo && hasVideos ? (
          <p className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400">
            Showing sample picks while creator drops roll in.
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-8">
            {continueWatching.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Continue watching
                </h2>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  {continueWatching.slice(0, 2).map((video) => (
                    <WatchVideoCard
                      key={`continue-${video.id}`}
                      video={video}
                      onPlay={setActiveVideo}
                      onShare={handleShare}
                      onComment={handleComment}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {filteredEmpty ? (
              <WatchEmptyState onDropMoment={() => setShowDropMoment(true)} />
            ) : (
              <>
                <section>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {activeCategory === "All" ? "Trending feed" : activeCategory}
                  </h2>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    {visibleVideos.map((video) => (
                      <WatchVideoCard
                        key={video.id}
                        video={video}
                        onPlay={setActiveVideo}
                        onShare={handleShare}
                        onComment={handleComment}
                      />
                    ))}
                  </div>
                  {visibleCount < videos.length ? (
                    <div ref={loadMoreRef} className="mt-8 flex justify-center">
                      <div className="grid w-full gap-6 sm:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <WatchCardSkeleton key={`more-${index}`} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            )}
          </div>

          <div className="order-last lg:order-none">
            <WatchSidebar
              trending={sidebarData.trending}
              newReleases={sidebarData.newReleases}
            />
          </div>
        </div>
      </div>

      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
        onShare={handleShare}
        onComment={handleComment}
      />

      <DropMomentModal
        open={showDropMoment}
        onClose={() => setShowDropMoment(false)}
        onCreated={() => {
          setShowDropMoment(false);
          void loadVideos();
        }}
      />

      {momentViewerIndex !== null ? (
        <MomentViewer
          groups={momentGroups}
          initialGroupIndex={momentViewerIndex}
          currentUserId={currentUserId}
          onClose={() => setMomentViewerIndex(null)}
          onDeleted={() => {
            setMomentViewerIndex(null);
            void loadVideos();
          }}
        />
      ) : null}
    </div>
  );
}
