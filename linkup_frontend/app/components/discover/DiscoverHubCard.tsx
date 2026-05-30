"use client";

import Link from "next/link";
import { useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { DiscoverHub } from "@/src/lib/discovery";
import { joinGroup } from "@/src/lib/groups";

type DiscoverHubCardProps = {
  hub: DiscoverHub;
};

export default function DiscoverHubCard({ hub }: DiscoverHubCardProps) {
  const [isMember, setIsMember] = useState(hub.isMember);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (isMember || isJoining) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinGroup(hub.id);
      setIsMember(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not join hub.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="linkup-card p-5 transition hover:border-brand-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
          <Users className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400">
          {hub.category}
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        {hub.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {hub.description}
      </p>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        {hub.membersCount} member{hub.membersCount === 1 ? "" : "s"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {isMember ? (
          <Link
            href={`/groups/${hub.id}`}
            className="linkup-btn-secondary min-h-[40px] flex-1 text-xs"
          >
            Open Hub
          </Link>
        ) : (
          <button
            type="button"
            disabled={isJoining}
            onClick={() => void handleJoin()}
            className="linkup-btn-primary min-h-[40px] flex-1 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {isJoining ? "Joining…" : "Join"}
          </button>
        )}
        <Link
          href={`/groups/${hub.id}`}
          className="linkup-btn-ghost min-h-[40px] flex-1 text-xs"
        >
          View
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
