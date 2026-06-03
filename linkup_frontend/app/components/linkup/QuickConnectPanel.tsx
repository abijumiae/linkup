"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { connectUser } from "@/src/lib/connections";
import OnlineStatusDot from "../OnlineStatusDot";
import OnlineStatusBadge from "../OnlineStatusBadge";
import UserAvatar from "../UserAvatar";

type QuickConnectSuggestion = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  subtitle?: string;
  isFollowingAuthor?: boolean;
};

type QuickConnectPanelProps = {
  suggestions?: QuickConnectSuggestion[];
  emptyMessage?: string;
  onConnectionChange?: () => void;
};

export default function QuickConnectPanel({
  suggestions = [],
  emptyMessage = "Quick Connect suggestions will appear as your network grows.",
  onConnectionChange,
}: QuickConnectPanelProps) {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    suggestions.forEach((person) => {
      if (person.isFollowingAuthor) {
        initial.add(person.id);
      }
    });
    return initial;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(userId: string) {
    setPendingId(userId);
    setError(null);

    try {
      const result = await connectUser(userId);
      setConnectedIds((current) => {
        const next = new Set(current);
        if (result.following) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
      onConnectionChange?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="linkup-panel p-5">
      <p className="linkup-eyebrow">Quick Connect</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Suggested connections
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Creators and professionals worth connecting with.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/80 p-4 text-center dark:border-white/15 dark:bg-brand-dark/60">
            <UserPlus className="mx-auto h-5 w-5 text-brand-primary dark:text-brand-secondary" />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {emptyMessage}
            </p>
            <Link
              href="/explore"
              className="linkup-btn-secondary mt-4 inline-flex min-h-[40px] text-xs"
            >
              Discover people
            </Link>
          </div>
        ) : (
          suggestions.map((person) => {
            const isConnected = connectedIds.has(person.id);
            return (
              <div
                key={person.id}
                className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 px-4 py-3.5 dark:border-white/10 dark:from-brand-dark/85 dark:to-brand-dark/60"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={person.avatarUrl}
                      name={person.name}
                      username={person.username}
                      size="md"
                    />
                    <OnlineStatusDot userId={person.id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{person.username}
                    </p>
                    <div className="mt-0.5">
                      <OnlineStatusBadge
                        userId={person.id}
                        showLabel
                        size="sm"
                      />
                    </div>
                    {person.subtitle ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {person.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pendingId === person.id}
                    onClick={() => void handleConnect(person.id)}
                    className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                      isConnected
                        ? "border border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                        : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {pendingId === person.id
                      ? "..."
                      : isConnected
                        ? "Connected"
                        : "Connect"}
                  </button>
                  <Link
                    href={`/explore?q=${encodeURIComponent(person.username)}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/messages?userId=${encodeURIComponent(person.id)}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Start Chat
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
