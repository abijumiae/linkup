"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { SearchUser } from "@/src/lib/discovery";
import { toggleFollow } from "@/src/lib/posts";

type SearchUserCardProps = {
  user: SearchUser;
  currentUserId: string | null;
};

export default function SearchUserCard({
  user,
  currentUserId,
}: SearchUserCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowingAuthor);
  const [error, setError] = useState<string | null>(null);

  const isSelf = currentUserId === user.id;

  async function handleFollow() {
    setError(null);

    try {
      const result = await toggleFollow(user.id);
      setIsFollowing(result.following);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to follow user.");
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-lg font-semibold text-violet-300">
            {user.name[0]}
          </div>
          <div>
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-sm text-slate-400">@{user.username}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        {!isSelf ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages?userId=${user.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-sky-400/30 hover:bg-white/10"
            >
              <Mail className="h-4 w-4 text-sky-300" />
              Message
            </Link>
            <button
              type="button"
              onClick={() => void handleFollow()}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                isFollowing
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-400/30 hover:bg-white/10"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
