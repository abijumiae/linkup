"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import type { Moment, MomentGroup } from "@/src/lib/moments";
import { deleteMoment } from "@/src/lib/moments";

type MomentViewerProps = {
  groups: MomentGroup[];
  initialGroupIndex: number;
  currentUserId: string | null;
  onClose: () => void;
  onDeleted: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

function momentProgress(moment: Moment, now: number): number {
  const created = new Date(moment.createdAt).getTime();
  const expires = new Date(moment.expiresAt).getTime();
  const total = expires - created;
  if (total <= 0) {
    return 0;
  }
  const elapsed = now - created;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export default function MomentViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onDeleted,
}: MomentViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [momentIndex, setMomentIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isDeleting, setIsDeleting] = useState(false);

  const activeGroup = groups[groupIndex];
  const moments = activeGroup?.moments ?? [];
  const currentMoment = moments[momentIndex];

  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setMomentIndex(0);
  }, [initialGroupIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentMoment) {
      return;
    }

    const expiresAt = new Date(currentMoment.expiresAt).getTime();
    if (expiresAt <= now) {
      onDeleted();
      onClose();
    }
  }, [currentMoment, now, onClose, onDeleted]);

  const goNext = useCallback(() => {
    if (momentIndex < moments.length - 1) {
      setMomentIndex((value) => value + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setMomentIndex(0);
      return;
    }

    onClose();
  }, [groupIndex, groups.length, momentIndex, moments.length, onClose]);

  const goPrev = useCallback(() => {
    if (momentIndex > 0) {
      setMomentIndex((value) => value - 1);
      return;
    }

    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((value) => value - 1);
      setMomentIndex(Math.max(0, prevGroup.moments.length - 1));
    }
  }, [groupIndex, groups, momentIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
      if (event.key === "ArrowLeft") {
        goPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  const progressBars = useMemo(
    () =>
      moments.map((moment, index) => ({
        id: moment.id,
        progress:
          index < momentIndex
            ? 100
            : index === momentIndex
              ? momentProgress(moment, now)
              : 0,
      })),
    [momentIndex, moments, now],
  );

  if (!activeGroup || !currentMoment) {
    return null;
  }

  const isOwner = currentUserId === currentMoment.userId;
  const isTextOnly =
    currentMoment.mediaType === "text" ||
    (!currentMoment.mediaUrl && Boolean(currentMoment.content));

  const handleDelete = async () => {
    if (!isOwner || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMoment(currentMoment.id);
      onDeleted();
      if (moments.length <= 1) {
        onClose();
      } else if (momentIndex >= moments.length - 1) {
        setMomentIndex((value) => Math.max(0, value - 1));
      }
    } catch {
      // Keep viewer open on failure.
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950/95">
      <div className="absolute inset-0 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
        <div className="flex items-center gap-1 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {progressBars.map((bar) => (
            <div
              key={bar.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-300 ease-linear"
                style={{ width: `${bar.progress}%` }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            {activeGroup.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeGroup.user.avatarUrl}
                alt={activeGroup.user.name}
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                {getInitials(activeGroup.user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {activeGroup.user.name}
              </p>
              <p className="text-xs text-white/60">Moment is live</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOwner ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Delete moment"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="relative mx-auto flex h-[calc(100dvh-7rem)] max-h-[720px] w-full max-w-md flex-col overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative flex-1 overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
            {currentMoment.mediaType === "image" && currentMoment.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentMoment.mediaUrl}
                alt=""
                className="h-full w-full object-contain sm:object-cover"
              />
            ) : null}

            {currentMoment.mediaType === "video" && currentMoment.mediaUrl ? (
              <video
                key={currentMoment.id}
                src={currentMoment.mediaUrl}
                className="h-full w-full object-contain sm:object-cover"
                controls
                playsInline
                autoPlay
              />
            ) : null}

            {isTextOnly ? (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br p-8 ${
                  currentMoment.background ??
                  "from-brand-primary to-brand-secondary"
                }`}
              >
                <p className="text-center text-2xl font-semibold leading-snug text-white drop-shadow-md sm:text-3xl">
                  {currentMoment.content}
                </p>
              </div>
            ) : null}

            {currentMoment.content &&
            currentMoment.mediaUrl &&
            currentMoment.mediaType !== "text" ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-6 pt-16">
                <p className="text-base font-medium leading-relaxed text-white">
                  {currentMoment.content}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              aria-label="Previous moment"
              onClick={goPrev}
              className="absolute left-0 top-0 h-full w-1/3"
            />
            <button
              type="button"
              aria-label="Next moment"
              onClick={goNext}
              className="absolute right-0 top-0 h-full w-1/3"
            />
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-white/70">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              disabled={groupIndex === 0 && momentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm transition hover:bg-white/10 hover:text-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
