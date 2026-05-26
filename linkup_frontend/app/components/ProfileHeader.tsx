"use client";

import {
  Globe,
  Languages,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";
import { User as AuthUser } from "@/src/lib/auth";
import {
  formatAccountType,
  formatLanguageLabel,
} from "@/src/lib/profileOptions";

type ProfileHeaderProps = {
  user: AuthUser;
  followers?: number;
  following?: number;
  posts?: number;
  onEditProfile: () => void;
  isEditing?: boolean;
};

function getInitials(user: AuthUser): string {
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
  isEditing = false,
}: ProfileHeaderProps) {
  const avatarLabel = getInitials(user);
  const locationLabel = user.country ?? "Not set";
  const languageLabel = formatLanguageLabel(user.language);
  const bioLabel =
    user.bio?.trim() || "Add a bio to tell people more about yourself.";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
      <div className="h-28 bg-gradient-to-r from-violet-600/25 via-fuchsia-500/15 to-sky-500/25 sm:h-36" />

      <div className="px-4 pb-6 sm:px-6">
        <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
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
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 lg:self-auto"
            >
              <Pencil className="h-4 w-4" />
              Edit profile
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {followers.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Followers
            </p>
          </div>
          <div className="border-x border-slate-200 px-2 text-center dark:border-white/10 sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {following.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Following
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {posts.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Posts</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5" />
              Account type
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              {formatAccountType(user.accountType)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Country
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              {locationLabel}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Languages className="h-3.5 w-3.5" />
              Language
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              {languageLabel}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              Email
            </p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-white">
              {user.email}
            </p>
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
