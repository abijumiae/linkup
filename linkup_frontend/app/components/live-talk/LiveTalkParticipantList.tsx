"use client";

import { useMemo, useState } from "react";
import { LiveTalkParticipantView } from "@/app/hooks/useGroupLiveTalk";
import LiveTalkParticipantCompact from "./LiveTalkParticipantCompact";
import LiveTalkParticipantRow from "./LiveTalkParticipantRow";

type LiveTalkParticipantListProps = {
  participants: LiveTalkParticipantView[];
  hostId?: string;
  activeMicUserId?: string | null;
  localUserId: string;
  isUserOnline: (userId: string) => boolean;
  canHostControls?: boolean;
  onPassMic?: (userId: string) => void;
  onMuteParticipant?: (userId: string, isMuted: boolean) => void;
  onRemoveParticipant?: (userId: string) => void;
  onClearHand?: (userId: string) => void;
  onMakeHost?: (userId: string) => void;
  onGrantRoomAdmin?: (userId: string) => void;
  onRemoveRoomAdmin?: (userId: string) => void;
  canGrantRoomAdmin?: boolean;
  compact?: boolean;
};

function sortParticipants(
  participants: LiveTalkParticipantView[],
  hostId: string | undefined,
  activeMicUserId: string | null | undefined,
) {
  return [...participants].sort((a, b) => {
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
}

export default function LiveTalkParticipantList({
  participants,
  hostId,
  activeMicUserId,
  localUserId,
  isUserOnline,
  canHostControls = false,
  onPassMic,
  onMuteParticipant,
  onRemoveParticipant,
  onClearHand,
  onMakeHost,
  onGrantRoomAdmin,
  onRemoveRoomAdmin,
  canGrantRoomAdmin = false,
  compact = false,
}: LiveTalkParticipantListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sorted = useMemo(
    () => sortParticipants(participants, hostId, activeMicUserId),
    [participants, hostId, activeMicUserId],
  );

  if (compact) {
    return (
      <div className="border-b border-slate-200/60 bg-white/50 px-2 py-2 dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.map((p) => (
            <LiveTalkParticipantCompact
              key={p.userId}
              participant={p}
              activeMicUserId={activeMicUserId}
              localUserId={localUserId}
              isOnline={isUserOnline(p.userId)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="flex min-h-0 w-full flex-col border-slate-200/60 lg:w-72 lg:border-l xl:w-80 dark:lg:border-white/10">
      <div className="border-b border-slate-200/60 px-3 py-2.5 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Participants
        </h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {sorted.length} in room
        </p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1.5 sm:p-2">
        {sorted.map((p) => {
          const showHostMenu =
            canHostControls &&
            p.userId !== localUserId &&
            p.userId !== hostId;

          return (
            <LiveTalkParticipantRow
              key={p.userId}
              participant={p}
              hostId={hostId}
              activeMicUserId={activeMicUserId}
              localUserId={localUserId}
              isOnline={isUserOnline(p.userId)}
              menuOpen={openMenuId === p.userId}
              showHostMenu={showHostMenu}
              canGrantRoomAdmin={canGrantRoomAdmin}
              onToggleMenu={() =>
                setOpenMenuId((current) =>
                  current === p.userId ? null : p.userId,
                )
              }
              onGrantRoomAdmin={
                onGrantRoomAdmin
                  ? (id) => {
                      onGrantRoomAdmin(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onRemoveRoomAdmin={
                onRemoveRoomAdmin
                  ? (id) => {
                      onRemoveRoomAdmin(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onMakeHost={
                onMakeHost
                  ? (id) => {
                      onMakeHost(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onPassMic={
                onPassMic
                  ? (id) => {
                      onPassMic(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onMuteParticipant={
                onMuteParticipant
                  ? (id, muted) => {
                      onMuteParticipant(id, muted);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onClearHand={
                onClearHand
                  ? (id) => {
                      onClearHand(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
              onRemoveParticipant={
                onRemoveParticipant
                  ? (id) => {
                      onRemoveParticipant(id);
                      setOpenMenuId(null);
                    }
                  : undefined
              }
            />
          );
        })}
      </ul>
    </aside>
  );
}
