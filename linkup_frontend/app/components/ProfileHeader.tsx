"use client";

import { User } from "@/src/lib/auth";

type ProfileHeaderProps = {
  user: User;
  followers?: number;
  following?: number;
  posts?: number;
  onEditProfile: () => void;
};

function formatAccountType(accountType: User["accountType"]): string {
  return accountType.charAt(0) + accountType.slice(1).toLowerCase();
}

export default function ProfileHeader({
  user,
  followers = 0,
  following = 0,
  posts = 0,
  onEditProfile,
}: ProfileHeaderProps) {
  const avatarLabel = (user.name?.[0] ?? user.username?.[0] ?? "U").toUpperCase();
  const locationLabel = user.country ?? "Location not set";
  const languageLabel = user.language ?? "en";
  const bioLabel = user.bio?.trim() || "Add a bio to tell people more about yourself.";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-28 w-28 rounded-[2.5rem] object-cover ring-2 ring-violet-500/20 sm:h-32 sm:w-32"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-4xl font-semibold text-violet-300 sm:h-32 sm:w-32">
              {avatarLabel}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{user.name}</h1>
              {user.isVerified ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">@{user.username}</p>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{user.email}</p>
            <p className={`mt-3 text-sm leading-6 ${user.bio?.trim() ? "text-slate-700 dark:text-slate-300" : "italic text-slate-500"}`}>
              {bioLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {formatAccountType(user.accountType)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {user.role}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {locationLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {languageLabel}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-400">
              <span>{locationLabel}</span>
              <span className="text-violet-300">•</span>
              <span>Language: {languageLabel}</span>
            </div>
          </div>
        </div>
        <div className="space-y-5 text-right">
          <div className="grid grid-cols-3 gap-4 rounded-[2rem] bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3 dark:bg-slate-950/80 dark:text-slate-300">
            <div className="space-y-1 border-r border-slate-200 pr-4 dark:border-white/10">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">{followers.toLocaleString()}</p>
              <p>Followers</p>
            </div>
            <div className="space-y-1 border-r border-slate-200 px-4 dark:border-white/10">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">{following.toLocaleString()}</p>
              <p>Following</p>
            </div>
            <div className="space-y-1 pl-4">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">{posts}</p>
              <p>Posts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center justify-center rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-violet-400"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </section>
  );
}
