"use client";

import Link from "next/link";
import { Flame, Sparkles, User, Video } from "lucide-react";
import {
  formatWatchDuration,
  WatchVideo,
} from "@/src/lib/watch";
import { formatViewCount } from "@/src/lib/watchEngagement";

type WatchSidebarProps = {
  trending: WatchVideo[];
  newReleases: WatchVideo[];
};

export default function WatchSidebar({
  trending,
  newReleases,
}: WatchSidebarProps) {
  const suggestedCreators = Array.from(
    new Map(
      [...trending, ...newReleases]
        .filter((video) => video.creator)
        .map((video) => [video.creator!.id, video.creator!]),
    ).values(),
  ).slice(0, 4);

  return (
    <aside className="space-y-5">
      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Trending videos
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {trending.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Trending picks will appear here.
            </li>
          ) : (
            trending.slice(0, 5).map((video, index) => (
              <li key={video.id}>
                <Link
                  href={`/watch/${video.id}`}
                  className="flex gap-3 rounded-xl border border-slate-200/90 p-2.5 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:hover:bg-brand-primary/10"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary dark:text-brand-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {video.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatViewCount(video.viewsCount ?? 0)} views
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Suggested creators
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {suggestedCreators.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Creator suggestions will appear here.
            </li>
          ) : (
            suggestedCreators.map((creator) => (
              <li key={creator.id}>
                <Link
                  href={`/profile`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  {creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creator.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {creator.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{creator.username}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            New releases
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {newReleases.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Fresh drops will land here.
            </li>
          ) : (
            newReleases.slice(0, 4).map((video) => (
              <li key={video.id}>
                <Link
                  href={`/watch/${video.id}`}
                  className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <Video className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {video.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatWatchDuration(video.duration)}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </aside>
  );
}
