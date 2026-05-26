"use client";

import Link from "next/link";
import type { Group } from "@/src/lib/groups";

type GroupCardProps = {
  group: Group;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  isLoading?: boolean;
};

export default function GroupCard({
  group,
  onJoin,
  onLeave,
  isLoading = false,
}: GroupCardProps) {
  const coverLabel = group.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const postCount =
    (group as Group & { postsCount?: number; postCount?: number }).postsCount ??
    (group as Group & { postsCount?: number; postCount?: number }).postCount;

  const handleMembership = () => {
    if (group.isOwner) {
      return;
    }
    if (group.isMember) {
      onLeave?.(group.id);
    } else {
      onJoin?.(group.id);
    }
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
      <div className="bg-gradient-to-r from-violet-500/20 via-sky-500/10 to-cyan-400/10 p-4 text-sm font-semibold uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
        {group.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.coverImage}
            alt=""
            className="h-16 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-base font-bold text-violet-700">
              {coverLabel}
            </span>
            {group.isOwner ? (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">
                Owner
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{group.name}</p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {group.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
            {group.membersCount} {group.membersCount === 1 ? "member" : "members"}
          </span>
          {typeof postCount === "number" ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
              {postCount} {postCount === 1 ? "post" : "posts"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex flex-wrap gap-2">
            {!group.isOwner && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleMembership}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition disabled:opacity-50 ${
                  group.isMember
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                    : "bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-200"
                }`}
              >
                {group.isMember ? "Joined" : "Join"}
              </button>
            )}
            <Link
              href={`/groups/${group.id}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-violet-400/40 hover:text-slate-900 dark:border-white/10 dark:text-slate-200 dark:hover:text-white"
            >
              View group
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
