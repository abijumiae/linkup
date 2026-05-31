"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { DiscoverPerson } from "@/src/lib/discovery";
import { formatAccountType, toggleFollow } from "@/src/lib/posts";

type DiscoverPersonCardProps = {
  user: DiscoverPerson;
  currentUserId: string | null;
};

function getInitials(name: string, username: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? username[0] ?? "U").toUpperCase();
}

export default function DiscoverPersonCard({
  user,
  currentUserId,
}: DiscoverPersonCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowingAuthor);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSelf = currentUserId === user.id;

  async function handleFollow() {
    setError(null);
    setIsUpdating(true);

    try {
      const result = await toggleFollow(user.id);
      setIsFollowing(result.following);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="linkup-card p-4 transition hover:border-brand-primary/25 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-primary/20"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/20">
              {getInitials(user.name, user.username)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              @{user.username}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {formatAccountType(user.accountType)}
              {user.isVerified ? " · Verified" : ""}
            </p>
            {user.bio ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                {user.bio}
              </p>
            ) : null}
          </div>
        </div>
        {!isSelf ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => void handleFollow()}
              className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 sm:flex-none ${
                isFollowing
                  ? "border border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                  : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20 hover:from-brand-primary-hover hover:to-brand-secondary-hover"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isUpdating ? "Updating…" : isFollowing ? "Connected" : "Connect"}
            </button>
            <Link
              href={`/explore?q=${encodeURIComponent(user.username)}`}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 sm:flex-none"
            >
              View Profile
            </Link>
            <Link
              href={`/messages?userId=${user.id}`}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 active:scale-[0.98] dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10 sm:flex-none"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Start Chat
            </Link>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
