"use client";

import { Hand, Mic, X } from "lucide-react";
import { RaisedHandQueueItem } from "@/src/lib/groupLiveTalk";

type LiveTalkMicQueueProps = {
  raisedHands: RaisedHandQueueItem[];
  loading: boolean;
  canHost: boolean;
  onPassMic: (userId: string) => void;
  onClearHand: (userId: string) => void;
};

function formatQueueTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function LiveTalkMicQueue({
  raisedHands,
  loading,
  canHost,
  onPassMic,
  onClearHand,
}: LiveTalkMicQueueProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center gap-2">
        <Hand className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Mic Queue
        </h3>
      </div>

      {raisedHands.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No raised hands yet.
        </p>
      ) : (
        <ul className="max-h-40 space-y-2 overflow-y-auto overscroll-contain">
          {raisedHands.map((item, index) => (
            <li
              key={item.userId}
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-brand-dark/60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-bold text-white">
                {initials(item.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {item.user.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  #{index + 1} · {formatQueueTime(item.handRaisedAt)}
                </p>
              </div>
              {canHost ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onPassMic(item.userId)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary px-2 text-white disabled:opacity-50"
                    aria-label={`Pass mic to ${item.user.name}`}
                    title="Pass mic"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onClearHand(item.userId)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"
                    aria-label={`Clear hand for ${item.user.name}`}
                    title="Clear hand"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
