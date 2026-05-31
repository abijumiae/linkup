"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { SearchUser } from "@/src/lib/discovery";
import { resolveProfileImageUrl } from "@/src/lib/profileMedia";
import { toggleFollow } from "@/src/lib/posts";
import OnlineStatusDot from "./OnlineStatusDot";

type SearchUserCardProps = {
  user: SearchUser;
  currentUserId: string | null;
};

function getInitials(name: string, username: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? username[0] ?? "U").toUpperCase();
}

export default function SearchUserCard({
  user,
  currentUserId,
}: SearchUserCardProps) {
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
      setError(err instanceof ApiError ? err.message : "Unable to follow user.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-brand-dark/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveProfileImageUrl(user.avatarUrl) ?? user.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-brand-primary/20"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                {getInitials(user.name, user.username)}
              </div>
            )}
            {!isSelf ? <OnlineStatusDot userId={user.id} /> : null}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              @{user.username}
            </p>
          </div>
        </div>
        {!isSelf ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages?userId=${user.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Mail className="h-4 w-4 text-brand-secondary" />
              Start Chat
            </Link>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => void handleFollow()}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                isFollowing
                  ? "border border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                  : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20 hover:from-brand-primary-hover hover:to-brand-secondary-hover"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              {isUpdating ? "Updating…" : isFollowing ? "Connected" : "Connect"}
            </button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
