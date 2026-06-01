"use client";

import { Hand, Mic, MicOff } from "lucide-react";
import { LiveTalkParticipantView } from "@/app/hooks/useGroupLiveTalk";
import OnlineStatusBadge from "../OnlineStatusBadge";

type LiveTalkParticipantListProps = {
  participants: LiveTalkParticipantView[];
  hostId?: string;
  activeMicUserId?: string | null;
  localUserId: string;
  isUserOnline: (userId: string) => boolean;
  compact?: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function LiveTalkParticipantList({
  participants,
  hostId,
  activeMicUserId,
  localUserId,
  isUserOnline,
  compact = false,
}: LiveTalkParticipantListProps) {
  const sorted = [...participants].sort((a, b) => {
    if (a.userId === activeMicUserId) {
      return -1;
    }
    if (b.userId === activeMicUserId) {
      return 1;
    }
    if (a.userId === hostId) {
      return -1;
    }
    if (b.userId === hostId) {
      return 1;
    }
    if (a.handRaised && !b.handRaised) {
      return -1;
    }
    if (b.handRaised && !a.handRaised) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.map((p) => {
          const holdsMic = p.userId === activeMicUserId;
          return (
            <div
              key={p.userId}
              className={`relative flex shrink-0 flex-col items-center gap-1 ${
                holdsMic && !p.isMuted ? "scale-105" : ""
              }`}
            >
              <div className="relative">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-bold text-white ring-2 ${
                    holdsMic && !p.isMuted
                      ? "animate-pulse ring-brand-secondary"
                      : "ring-transparent"
                  }`}
                >
                  {initials(p.name)}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                    isUserOnline(p.userId) ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                  title={isUserOnline(p.userId) ? "Online" : "Offline"}
                />
                {holdsMic ? (
                  <Mic className="absolute -left-0.5 -top-0.5 h-3.5 w-3.5 text-brand-secondary" />
                ) : null}
              </div>
              {p.handRaised ? (
                <Hand className="absolute right-0 top-0 h-4 w-4 text-amber-400" />
              ) : null}
              <span className="max-w-[4rem] truncate text-[10px] text-slate-400">
                {p.userId === localUserId ? "You" : p.name.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="flex min-h-0 w-full flex-col border-l border-slate-200/80 dark:border-white/10 lg:w-72 xl:w-80">
      <div className="border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          In room
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {sorted.length} participant{sorted.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto overscroll-contain p-2">
        {sorted.map((p) => {
          const online = isUserOnline(p.userId);
          const holdsMic = p.userId === activeMicUserId;
          return (
            <li
              key={p.userId}
              className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                holdsMic && !p.isMuted
                  ? "bg-brand-primary/15 ring-1 ring-brand-secondary/40 dark:bg-brand-primary/25"
                  : "hover:bg-slate-100/80 dark:hover:bg-white/5"
              }`}
            >
              <div className="relative">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-bold text-white ${
                    holdsMic && !p.isMuted ? "ring-2 ring-brand-secondary" : ""
                  }`}
                >
                  {initials(p.name)}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    online ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                  title={online ? "Online" : "Offline"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {p.userId === localUserId ? "You" : p.name}
                  {p.userId === hostId ? (
                    <span className="ml-1.5 rounded bg-brand-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                      Host
                    </span>
                  ) : null}
                  {holdsMic ? (
                    <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      On mic
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <OnlineStatusBadge userId={p.userId} showLabel size="sm" />
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {holdsMic && !p.isMuted ? (
                      <span className="font-medium text-brand-secondary">
                        Speaking now
                      </span>
                    ) : p.isMuted ? (
                      <>
                        <MicOff className="h-3 w-3" /> Muted
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" /> Listening
                      </>
                    )}
                    {p.handRaised ? (
                      <span className="text-amber-500 dark:text-amber-400">
                        · Hand raised
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
