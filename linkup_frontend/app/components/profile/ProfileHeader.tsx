"use client";

import {
  Briefcase,
  ImageIcon,
  Languages,
  MapPin,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";
import { ProfileUser } from "@/src/lib/users";
import { formatAccountType, formatLanguageLabel } from "@/src/lib/profileOptions";
import {
  getProfileInitials,
  resolveProfileImageUrl,
} from "@/src/lib/profileMedia";
import OnlineStatusDot from "../OnlineStatusDot";
import OnlineStatusBadge from "../OnlineStatusBadge";

type ProfileHeaderProps = {
  user: ProfileUser;
  onEditProfile: () => void;
  onEditAvatar?: () => void;
  onEditCover?: () => void;
  onShareProfile?: () => void;
  isEditing?: boolean;
  hasActiveMoment?: boolean;
};

export default function ProfileHeader({
  user,
  onEditProfile,
  onEditAvatar,
  onEditCover,
  onShareProfile,
  isEditing = false,
  hasActiveMoment = false,
}: ProfileHeaderProps) {
  const avatarSrc = resolveProfileImageUrl(user.avatarUrl);
  const coverSrc = resolveProfileImageUrl(user.coverUrl);
  const initials = getProfileInitials(user);

  const stats = [
    { label: "Sparks", value: user.postsCount ?? 0, icon: Sparkles },
    { label: "Connections", value: user.followingCount ?? 0, icon: Users },
    { label: "Hubs", value: user.hubsCount ?? 0, icon: Users },
    { label: "Work Drops", value: user.workCount ?? 0, icon: Briefcase },
  ];

  return (
    <section className="linkup-panel overflow-hidden p-0">
      <div className="relative h-36 overflow-hidden sm:h-44 md:h-48">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={`${user.name} Pulse Cover`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-violet-600 to-brand-secondary" />
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-brand-primary/70 via-violet-500/60 to-brand-secondary/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.2),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.14),transparent_38%)]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:left-4 sm:top-4">
          <Sparkles className="h-3 w-3" />
          LinkUp Card
        </span>

        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
          <div className="max-w-md rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md">
            <p className="text-xs font-medium text-white/95 sm:text-sm">
              Building my network on LinkUp
            </p>
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="group relative -mt-14 shrink-0 sm:-mt-16">
              <div
                className={`rounded-2xl bg-gradient-to-tr from-brand-primary via-violet-500 to-brand-secondary p-[3px] shadow-lg shadow-brand-primary/25 ${
                  hasActiveMoment ? "ring-2 ring-brand-secondary/40 ring-offset-2 ring-offset-white dark:ring-offset-brand-dark" : ""
                }`}
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt={`${user.name} LinkUp Avatar`}
                    loading="lazy"
                    className="h-24 w-24 rounded-[14px] border-2 border-white object-cover dark:border-brand-dark sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[14px] border-2 border-white bg-gradient-to-br from-brand-primary to-brand-secondary text-2xl font-semibold text-white dark:border-brand-dark sm:h-28 sm:w-28">
                    {initials}
                  </div>
                )}
              </div>
              <OnlineStatusDot userId={user.id} className="bottom-1 right-1" />
              {!isEditing && onEditAvatar ? (
                <button
                  type="button"
                  onClick={onEditAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100 group-focus-within:bg-black/35 group-focus-within:opacity-100"
                  aria-label="Edit LinkUp Avatar"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow">
                    <UserCircle2 className="h-3.5 w-3.5" />
                    Edit
                  </span>
                </button>
              ) : null}
              <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary dark:text-brand-secondary">
                Identity Ring
              </p>
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
              <div className="mt-1.5">
                <OnlineStatusBadge userId={user.id} showLabel size="md" />
              </div>
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
            <div className="flex w-full flex-col gap-2 self-start sm:flex-row sm:flex-wrap lg:w-auto lg:self-auto">
              <button
                type="button"
                onClick={onEditAvatar}
                className="linkup-btn-secondary min-h-[44px] flex-1 px-4 sm:flex-none sm:px-5"
              >
                <UserCircle2 className="h-4 w-4" />
                Edit Avatar
              </button>
              <button
                type="button"
                onClick={onEditCover}
                className="linkup-btn-secondary min-h-[44px] flex-1 px-4 sm:flex-none sm:px-5"
              >
                <ImageIcon className="h-4 w-4" />
                Edit Pulse Cover
              </button>
              <button
                type="button"
                onClick={onEditProfile}
                className="linkup-btn-primary min-h-[44px] flex-1 px-4 sm:flex-none sm:px-5"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={onShareProfile}
                className="linkup-btn-secondary min-h-[44px] flex-1 px-4 sm:flex-none sm:px-5"
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
