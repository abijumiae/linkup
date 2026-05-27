"use client";

import type { ReactNode } from "react";
import {
  Briefcase,
  Handshake,
  Languages,
  MapPin,
  Pencil,
  Rocket,
  ShieldCheck,
  User,
  Users,
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300/80">
      {children}
    </p>
  );
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
  const bioText = user.bio?.trim();
  const buildingHint =
    bioText && bioText.length > 80
      ? bioText
      : "Share what you're building — projects, ideas, or what you're launching next.";
  const connectHint =
    bioText && bioText.length <= 80 && bioText.length > 0
      ? bioText
      : "Collaborations, mentorship, co-building, and meaningful connections on LinkUp.";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
        <div className="h-24 bg-gradient-to-r from-violet-600/25 via-fuchsia-500/15 to-sky-500/25 sm:h-28" />

        <div className="px-4 pb-6 sm:px-6">
          <SectionLabel>My LinkUp Card</SectionLabel>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {user.name}
                  </h2>
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
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                  {formatAccountType(user.accountType)}
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
                Network
              </p>
            </div>
            <div className="border-x border-slate-200 px-2 text-center dark:border-white/10 sm:text-left">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {following.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Connections
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {posts.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sparks
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-violet-500" />
              {locationLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
              <Languages className="h-3.5 w-3.5 text-violet-500" />
              {languageLabel}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <SectionLabel>Who I am</SectionLabel>
          </div>
          <p
            className={`text-sm leading-7 ${
              bioText
                ? "text-slate-700 dark:text-slate-300"
                : "italic text-slate-500 dark:text-slate-400"
            }`}
          >
            {bioText ||
              "Tell your network who you are — background, vibe, and what makes you you."}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <SectionLabel>What I do</SectionLabel>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatAccountType(user.accountType)}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your role and focus on LinkUp.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <SectionLabel>Network</SectionLabel>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {followers.toLocaleString()}
            </span>{" "}
            in your network ·{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {following.toLocaleString()}
            </span>{" "}
            connections
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <SectionLabel>What I&apos;m building</SectionLabel>
          </div>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {buildingHint}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <SectionLabel>Open to connect for</SectionLabel>
          </div>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {connectHint}
          </p>
        </section>
      </div>
    </div>
  );
}
