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

const queueBtn =
  "inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-45 dark:bg-white/10 dark:text-slate-100";

export default function LiveTalkMicQueue({
  raisedHands,
  loading,
  canHost,
  onPassMic,
  onClearHand,
}: LiveTalkMicQueueProps) {
  return (
    <section className="rounded-xl bg-slate-50/80 px-2.5 py-2 dark:bg-white/[0.03]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Hand className="h-3.5 w-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
          Mic queue
        </h3>
        {raisedHands.length > 0 ? (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            {raisedHands.length}
          </span>
        ) : null}
      </div>

      {raisedHands.length === 0 ? (
        <p className="px-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          No raised hands.
        </p>
      ) : (
        <ul className="max-h-32 space-y-1 overflow-y-auto overscroll-contain">
          {raisedHands.map((item, index) => (
            <li
              key={item.userId}
              className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1.5 dark:bg-brand-dark/60"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-[10px] font-bold text-white">
                {initials(item.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
                  {item.user.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  #{index + 1} · {formatQueueTime(item.handRaisedAt)}
                </p>
              </div>
              {canHost ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onPassMic(item.userId)}
                    className={`${queueBtn} bg-gradient-to-r from-brand-primary to-brand-secondary text-white`}
                    aria-label={`Pass mic to ${item.user.name}`}
                    title="Pass mic"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onClearHand(item.userId)}
                    className={queueBtn}
                    aria-label={`Clear hand for ${item.user.name}`}
                    title="Clear hand"
                  >
                    <X className="h-3.5 w-3.5" />
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
