"use client";

import { Globe, Languages, MapPin, Pencil, ShieldCheck } from "lucide-react";
import { User } from "@/src/lib/auth";
import {
  formatAccountType,
  formatLanguageLabel,
} from "@/src/lib/profileOptions";

type ProfileHeaderProps = {
  user: User;
  followers?: number;
  following?: number;
  posts?: number;
  onEditProfile: () => void;
};

function getInitials(user: User): string {
  const parts = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (user.name?.[0] ?? user.username?.[0] ?? "U").toUpperCase();
}

export default function ProfileHeader({
  user,
  followers = 0,
  following = 0,
  posts = 0,
  onEditProfile,
}: ProfileHeaderProps) {
  const avatarLabel = getInitials(user);
  const locationLabel = user.country ?? "Not set";
  const languageLabel = formatLanguageLabel(user.language);
  const bioLabel =
    user.bio?.trim() || "Add a bio to tell people more about yourself.";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
      <div className="h-32 bg-gradient-to-r from-violet-600/20 via-fuchsia-500/10 to-sky-500/20 sm:h-40" />

      <div className="px-4 pb-6 sm:px-6">
        <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg ring-2 ring-violet-500/20 dark:border-slate-900 sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-violet-500 to-sky-500 text-2xl font-semibold text-white shadow-lg dark:border-slate-900 sm:h-28 sm:w-28 sm:text-3xl">
                {avatarLabel}
              </div>
            )}

            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {user.name}
                </h1>
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                @{user.username}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300">
                  {formatAccountType(user.accountType)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300">
                  <MapPin className="h-3 w-3" />
                  {locationLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300">
                  <Languages className="h-3 w-3" />
                  {languageLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 lg:self-auto"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60 sm:max-w-md">
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {followers.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Followers</p>
          </div>
          <div className="border-x border-slate-200 px-2 text-center dark:border-white/10 sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {following.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Following</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {posts}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Posts</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            About
          </div>
          <p
            className={`text-sm leading-6 ${
              user.bio?.trim()
                ? "text-slate-700 dark:text-slate-300"
                : "italic text-slate-500 dark:text-slate-400"
            }`}
          >
            {bioLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
