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
  Tag,
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
  interests?: string[];
  openToConnect?: string;
  profession?: string;
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
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary dark:text-brand-secondary/80">
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
  interests = [],
  openToConnect,
  profession,
}: ProfileHeaderProps) {
  const avatarLabel = getInitials(user);
  const locationLabel = user.country ?? "Not set";
  const languageLabel = formatLanguageLabel(user.language);
  const bioText = user.bio?.trim();
  const buildingHint =
    bioText && bioText.length > 80
      ? bioText
      : "Share what you're building — projects, ideas, or what you're launching next.";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
        <div className="h-24 bg-gradient-to-r from-brand-primary/25 via-brand-primary/15 to-brand-secondary/25 sm:h-28" />

        <div className="px-4 pb-6 sm:px-6">
          <SectionLabel>My LinkUp Card</SectionLabel>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg ring-2 ring-brand-primary/20 dark:border-brand-dark sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-primary to-brand-secondary text-2xl font-semibold text-white shadow-lg dark:border-brand-dark sm:h-28 sm:w-28 sm:text-3xl">
                  {avatarLabel}
                </div>
              )}

              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {user.name}
                  </h2>
                  {user.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary dark:text-brand-secondary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  @{user.username}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary dark:text-brand-secondary">
                  {formatAccountType(user.accountType)}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover lg:self-auto"
              >
                <Pencil className="h-4 w-4" />
                Edit profile
              </button>
            ) : null}
          </div>

          <div className="linkup-stat-grid mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-brand-dark/60">
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">
                {followers.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Network
              </p>
            </div>
            <div className="min-w-0 border-x border-slate-200 px-1 text-center dark:border-white/10 sm:px-2 sm:text-left">
              <p className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">
                {following.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Connections
              </p>
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">
                {posts.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sparks
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-brand-primary" />
              {locationLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300">
              <Languages className="h-3.5 w-3.5 text-brand-primary" />
              {languageLabel}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            <SectionLabel>What I do</SectionLabel>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {profession?.trim() || formatAccountType(user.accountType)}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your role and focus on LinkUp.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            <SectionLabel>What I&apos;m building</SectionLabel>
          </div>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {buildingHint}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            <SectionLabel>Skills / interests</SectionLabel>
          </div>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1.5 text-xs font-medium text-brand-primary dark:text-brand-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">
              Add interests in Settings to show what you care about on your LinkUp Card.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            <SectionLabel>Open to connect for</SectionLabel>
          </div>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {openToConnect?.trim() ||
              "Set your connect preferences in Settings — collaborations, mentorship, co-building, and more."}
          </p>
        </section>
      </div>
    </div>
  );
}
