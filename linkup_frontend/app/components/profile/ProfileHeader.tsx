"use client";

import {
  Briefcase,
  Languages,
  MapPin,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { ProfileUser } from "@/src/lib/users";
import { formatAccountType, formatLanguageLabel } from "@/src/lib/profileOptions";

type ProfileHeaderProps = {
  user: ProfileUser;
  onEditProfile: () => void;
  onShareProfile?: () => void;
  isEditing?: boolean;
  hasActiveMoment?: boolean;
};

function getInitials(user: ProfileUser): string {
  const parts = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (user.name?.[0] ?? user.username?.[0] ?? "U").toUpperCase();
}

export default function ProfileHeader({
  user,
  onEditProfile,
  onShareProfile,
  isEditing = false,
  hasActiveMoment = false,
}: ProfileHeaderProps) {
  const stats = [
    { label: "Sparks", value: user.postsCount ?? 0, icon: Sparkles },
    { label: "Connections", value: user.followingCount ?? 0, icon: Users },
    { label: "Hubs", value: user.hubsCount ?? 0, icon: Users },
    { label: "Work Drops", value: user.workCount ?? 0, icon: Briefcase },
  ];

  return (
    <section className="linkup-panel overflow-hidden p-0">
      <div className="relative h-32 bg-gradient-to-r from-brand-primary via-violet-600 to-brand-secondary sm:h-36">
        {user.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      </div>

      <div className="relative px-4 pb-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              className={`-mt-12 shrink-0 ${
                hasActiveMoment
                  ? "rounded-full bg-gradient-to-tr from-brand-primary via-violet-500 to-brand-secondary p-[3px] shadow-lg shadow-brand-primary/25"
                  : ""
              }`}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-xl dark:border-brand-dark sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand-primary to-brand-secondary text-2xl font-semibold text-white shadow-xl dark:border-brand-dark sm:h-28 sm:w-28">
                  {getInitials(user)}
                </div>
              )}
            </div>

            <div className="min-w-0 pb-1">
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
              <p className="mt-2 inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary dark:text-brand-secondary">
                {formatAccountType(user.accountType)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-brand-primary dark:text-brand-secondary" />
                  {user.country ?? "Location not set"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300">
                  <Languages className="h-3.5 w-3.5 text-brand-primary dark:text-brand-secondary" />
                  {formatLanguageLabel(user.language)}
                </span>
              </div>
            </div>
          </div>

          {!isEditing ? (
            <div className="flex flex-wrap gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={onEditProfile}
                className="linkup-btn-primary min-h-[44px] px-5"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={onShareProfile}
                className="linkup-btn-secondary min-h-[44px] px-5"
              >
                <Share2 className="h-4 w-4" />
                Share Profile
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 px-3 py-3 text-center dark:border-white/10 dark:from-brand-dark/80 dark:to-brand-dark/60 sm:text-left"
              >
                <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <Icon className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
