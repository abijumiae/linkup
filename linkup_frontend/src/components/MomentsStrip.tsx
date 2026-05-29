"use client";

import { Plus } from "lucide-react";
import type { MomentGroup } from "@/src/lib/moments";

type MomentsStripProps = {
  groups: MomentGroup[];
  currentUserId: string | null;
  onDropMoment: () => void;
  onOpenGroup: (groupIndex: number) => void;
  isLoading?: boolean;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

function MomentAvatar({
  user,
  hasMoments,
  isOwn,
  onClick,
}: {
  user: MomentGroup["user"];
  hasMoments: boolean;
  isOwn: boolean;
  onClick: () => void;
}) {
  const ringClass = hasMoments
    ? "bg-gradient-to-tr from-brand-primary via-violet-500 to-brand-secondary p-[3px]"
    : "bg-slate-200 p-[2px] dark:bg-white/15";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center sm:w-[5.25rem]"
    >
      <div className={`rounded-2xl ${ringClass}`}>
        <div className="rounded-[14px] bg-white p-0.5 dark:bg-brand-dark">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/80 to-brand-secondary/80 text-sm font-semibold text-white sm:h-16 sm:w-16 sm:text-base">
              {getInitials(user.name)}
            </div>
          )}
        </div>
      </div>
      <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-slate-700 group-hover:text-brand-primary dark:text-slate-300 dark:group-hover:text-brand-secondary">
        {isOwn ? "You" : user.name.split(" ")[0]}
      </span>
    </button>
  );
}

export default function MomentsStrip({
  groups,
  currentUserId,
  onDropMoment,
  onOpenGroup,
  isLoading = false,
}: MomentsStripProps) {
  const hasAnyMoments = groups.some((group) => group.moments.length > 0);

  return (
    <section className="linkup-panel overflow-hidden p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="linkup-eyebrow">Today&apos;s Moments</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {hasAnyMoments
              ? "Tap a circle to view — live for 24 hours."
              : "No Moments yet. Drop the first moment."}
          </p>
        </div>
      </div>

      <div className="mt-4 -mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-min gap-3 px-1">
          <button
            type="button"
            onClick={onDropMoment}
            className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center sm:w-[5.25rem]"
          >
            <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl border-2 border-dashed border-brand-primary/40 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 text-brand-primary transition hover:border-brand-primary hover:from-brand-primary/15 hover:to-brand-secondary/15 dark:border-brand-secondary/40 dark:text-brand-secondary sm:h-[4.75rem] sm:w-[4.75rem]">
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-semibold leading-tight text-brand-primary dark:text-brand-secondary">
              Drop Moment
            </span>
          </button>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`moment-skeleton-${index}`}
                className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 sm:w-[5.25rem]"
              >
                <div className="h-[4.25rem] w-[4.25rem] animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10 sm:h-[4.75rem] sm:w-[4.75rem]" />
                <div className="h-3 w-12 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
              </div>
            ))
          ) : (
            groups.map((group, index) => (
              <MomentAvatar
                key={group.user.id}
                user={group.user}
                hasMoments={group.moments.length > 0}
                isOwn={group.user.id === currentUserId}
                onClick={() => onOpenGroup(index)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
