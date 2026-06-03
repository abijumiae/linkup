"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import UserAvatar from "@/app/components/UserAvatar";
import { User } from "@/src/lib/auth";
import { formatAccountType, formatLanguageLabel } from "@/src/lib/profileOptions";
import { resolveProfileImageUrl } from "@/src/lib/profileMedia";

type LinkUpCardPreviewProps = {
  user: Pick<
    User,
    | "name"
    | "username"
    | "avatarUrl"
    | "coverUrl"
    | "accountType"
    | "country"
    | "language"
  >;
  compact?: boolean;
  showBadge?: boolean;
};

export default function LinkUpCardPreview({
  user,
  compact = false,
  showBadge = true,
}: LinkUpCardPreviewProps) {
  const coverSrc = resolveProfileImageUrl(user.coverUrl);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverSrc]);

  return (
    <div
      className={`linkup-panel overflow-hidden p-0 ${
        compact ? "max-w-sm" : "w-full"
      }`}
    >
      <div
        className={`relative ${
          compact ? "h-24" : "h-32 sm:h-36"
        } overflow-hidden bg-gradient-to-br from-brand-primary via-violet-600 to-brand-secondary`}
      >
        {coverSrc && !coverFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={`${user.name} Pulse Cover`}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-brand-primary/80 via-violet-600/80 to-brand-secondary/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_40%)]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        {!compact ? (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md">
              <p className="text-xs font-medium text-white/95">
                Building my network on LinkUp
              </p>
            </div>
          </div>
        ) : null}
        {showBadge ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            LinkUp Card
          </span>
        ) : null}
      </div>

      <div className={`relative px-4 ${compact ? "pb-4 pt-0" : "pb-5 pt-0"}`}>
        <div className="-mt-8 flex items-end gap-3">
          <div className="relative shrink-0 rounded-2xl bg-gradient-to-tr from-brand-primary via-violet-500 to-brand-secondary p-[3px] shadow-lg shadow-brand-primary/25">
            <UserAvatar
              src={user.avatarUrl}
              name={user.name}
              username={user.username}
              size={compact ? "xl" : "2xl"}
              shape="squircle"
              className={
                compact
                  ? "h-14 w-14 border-2 border-white dark:border-brand-dark"
                  : "h-16 w-16 border-2 border-white dark:border-brand-dark sm:h-[4.5rem] sm:w-[4.5rem]"
              }
              alt={`${user.name} LinkUp Avatar`}
            />
            <span
              className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-brand-dark"
              aria-hidden
            />
          </div>
          <div className="min-w-0 pb-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              @{user.username}
            </p>
            <p className="mt-1 text-[11px] font-medium text-brand-primary dark:text-brand-secondary">
              {formatAccountType(user.accountType)}
            </p>
          </div>
        </div>
        {!compact ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-brand-dark/60">
              {user.country ?? "Location not set"}
            </span>
            <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-brand-dark/60">
              {formatLanguageLabel(user.language)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
