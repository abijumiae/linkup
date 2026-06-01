"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Users, Volume2 } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  endLiveTalk,
  joinLiveTalk,
  leaveLiveTalk,
  LiveTalkRoom,
  setLiveTalkMuted,
  startLiveTalk,
} from "@/src/lib/groupLiveTalk";
import {
  GroupLiveTalkSession,
  LiveTalkSocketParticipant,
} from "@/src/lib/groupLiveTalkSession";
import { useSocket } from "@/src/components/SocketProvider";

type ParticipantView = LiveTalkSocketParticipant & {
  speaking?: boolean;
};

type GroupLiveTalkPanelProps = {
  groupId: string;
  groupName: string;
  activeRoom: LiveTalkRoom | null;
  isMember: boolean;
  canEndRoom: boolean;
  onRoomChange: (room: LiveTalkRoom | null) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function GroupLiveTalkPanel({
  groupId,
  groupName,
  activeRoom,
  isMember,
  canEndRoom,
  onRoomChange,
}: GroupLiveTalkPanelProps) {
  const { socket, isConnected } = useSocket();
  const currentUser = getCurrentUser();
  const localUserId = currentUser?.id ?? "";

  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const sessionRef = useRef<GroupLiveTalkSession | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const room = activeRoom?.status === "ACTIVE" ? activeRoom : null;
  const isHost = room?.hostId === localUserId;

  const syncParticipantsFromRoom = useCallback((r: LiveTalkRoom) => {
    setParticipants(
      r.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        isMuted: p.isMuted,
      })),
    );
  }, []);

  useEffect(() => {
    if (room) {
      syncParticipantsFromRoom(room);
    } else {
      setParticipants([]);
      setInRoom(false);
    }
  }, [room, syncParticipantsFromRoom]);

  useEffect(() => {
    if (!socket || !room) {
      return;
    }

    const onStarted = (payload: { groupId: string; room: LiveTalkRoom }) => {
      if (payload.groupId === groupId) {
        onRoomChange(payload.room);
      }
    };

    const onEnded = (payload: { groupId: string; roomId: string }) => {
      if (payload.groupId === groupId) {
        setInfo("Live Talk ended.");
        onRoomChange(null);
        teardownSession();
      }
    };

    socket.on("live_talk_started", onStarted);
    socket.on("live_talk_ended", onEnded);

    return () => {
      socket.off("live_talk_started", onStarted);
      socket.off("live_talk_ended", onEnded);
    };
  }, [socket, room, groupId, onRoomChange]);

  const teardownSession = useCallback(() => {
    sessionRef.current?.leave(false);
    sessionRef.current = null;
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    audioElementsRef.current.clear();
    setInRoom(false);
    setMuted(false);
  }, []);

  const attachRemoteStream = useCallback(
    async (userId: string, stream: MediaStream) => {
      let audio = audioElementsRef.current.get(userId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        audioElementsRef.current.set(userId, audio);
      }
      audio.srcObject = stream;
      audio.muted = false;
      try {
        await audio.play();
        setNeedsAudioUnlock(false);
      } catch {
        setNeedsAudioUnlock(true);
      }
    },
    [],
  );

  const refreshActiveRoom = useCallback(async () => {
    try {
      const { fetchActiveLiveTalk } = await import("@/src/lib/groupLiveTalk");
      const next = await fetchActiveLiveTalk(groupId);
      onRoomChange(next);
    } catch {
      onRoomChange(null);
    }
  }, [groupId, onRoomChange]);

  const enterAudioSession = useCallback(
    async (r: LiveTalkRoom) => {
      if (!socket || !isConnected || !localUserId) {
        setError("Connection lost. Reconnecting...");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const joined = await joinLiveTalk(groupId, r.id);
        onRoomChange(joined);
        syncParticipantsFromRoom(joined);

        const session = new GroupLiveTalkSession({
          socket,
          localUserId,
          groupId,
          roomId: r.id,
          onRemoteStream: (userId, stream) => {
            void attachRemoteStream(userId, stream);
          },
          onRemoteRemoved: (userId) => {
            const el = audioElementsRef.current.get(userId);
            if (el) {
              el.pause();
              el.srcObject = null;
              audioElementsRef.current.delete(userId);
            }
            setParticipants((prev) => prev.filter((p) => p.userId !== userId));
          },
          onParticipants: (list) => {
            setParticipants(list);
          },
          onParticipantJoined: (p) => {
            setParticipants((prev) => {
              if (prev.some((x) => x.userId === p.userId)) {
                return prev;
              }
              return [...prev, p];
            });
          },
          onParticipantLeft: (userId) => {
            setParticipants((prev) => prev.filter((p) => p.userId !== userId));
          },
          onMuteChanged: (userId, isMuted) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.userId === userId ? { ...p, isMuted } : p,
              ),
            );
          },
          onSpeaking: (userId, speaking) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.userId === userId ? { ...p, speaking } : p,
              ),
            );
          },
          onConnected: () => {
            setInRoom(true);
            setInfo(null);
          },
          onEnded: () => {
            setInfo("Live Talk ended.");
            teardownSession();
            void refreshActiveRoom();
          },
          onError: (message) => {
            setError(message);
            teardownSession();
          },
        });

        sessionRef.current = session;
        await session.join();
        setInRoom(true);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not join Live Talk. Please try again.",
        );
        teardownSession();
      } finally {
        setLoading(false);
      }
    },
    [
      socket,
      isConnected,
      localUserId,
      groupId,
      onRoomChange,
      syncParticipantsFromRoom,
      attachRemoteStream,
      teardownSession,
      refreshActiveRoom,
    ],
  );

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await startLiveTalk(groupId);
      onRoomChange(created);
      await enterAudioSession(created);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not start Live Talk. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!room) {
      return;
    }
    await enterAudioSession(room);
  };

  const handleLeave = async () => {
    if (!room) {
      teardownSession();
      return;
    }

    setLoading(true);
    try {
      sessionRef.current?.leave(true);
      teardownSession();
      await leaveLiveTalk(groupId, room.id);
      await refreshActiveRoom();
      setInfo("You left Live Talk.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not leave Live Talk.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!room) {
      return;
    }

    setLoading(true);
    try {
      teardownSession();
      if (socket) {
        socket.emit("live_talk_end", { groupId, roomId: room.id });
      }
      await endLiveTalk(groupId, room.id);
      onRoomChange(null);
      setInfo("Live Talk ended.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not end Live Talk.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMute = async () => {
    if (!room) {
      return;
    }

    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);

    try {
      await setLiveTalkMuted(groupId, room.id, next);
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === localUserId ? { ...p, isMuted: next } : p,
        ),
      );
    } catch {
      setError("Could not update mute state.");
    }
  };

  const unlockAudio = async () => {
    for (const audio of audioElementsRef.current.values()) {
      try {
        await audio.play();
      } catch {
        // continue
      }
    }
    setNeedsAudioUnlock(false);
  };

  if (!isMember) {
    return null;
  }

  const participantCount =
    inRoom && participants.length > 0
      ? participants.length
      : room?.participants.length ?? 0;

  return (
    <>
      <section className="mb-8 rounded-[2rem] border border-brand-primary/20 bg-gradient-to-br from-brand-primary/10 via-white to-brand-secondary/10 p-5 shadow-lg dark:border-brand-primary/30 dark:from-brand-primary/15 dark:via-brand-dark/80 dark:to-brand-secondary/10 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary dark:text-brand-secondary">
              <Radio className="h-4 w-4" />
              Live Talk
            </p>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Live Talk uses your microphone while you are in the room. Audio is
              not recorded or stored.
            </p>
          </div>
          {room ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Active
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {info && !error ? (
          <p className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            {info}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!room ? (
            <button
              type="button"
              disabled={loading || !isConnected}
              onClick={() => void handleStart()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start Live Talk"}
            </button>
          ) : !inRoom ? (
            <>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Live Talk is active in {groupName} ·{" "}
                <span className="font-medium">{participantCount}</span> in room
              </p>
              <button
                type="button"
                disabled={loading || !isConnected}
                onClick={() => void handleJoin()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {loading ? "Joining…" : "Join Live Talk"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleJoin()}
              className="inline-flex min-h-11 items-center rounded-full border border-brand-primary/30 px-4 py-2 text-sm font-medium text-brand-primary dark:text-brand-secondary"
            >
              Reconnect audio
            </button>
          )}
        </div>

        {room && !inRoom ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Host: {room.host.name} (@{room.host.username})
          </p>
        ) : null}
      </section>

      {inRoom && room ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-brand-dark via-slate-950 to-brand-dark text-white"
          role="dialog"
          aria-label="Live Talk room"
        >
          <header className="safe-area-top flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-secondary/80">
                Live Talk
              </p>
              <h2 className="text-lg font-semibold">{groupName}</h2>
              <p className="text-sm text-slate-400">
                Host: {room.host.name}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="h-4 w-4" />
              {participants.length || 1}
            </div>
          </header>

          {needsAudioUnlock ? (
            <button
              type="button"
              onClick={() => void unlockAudio()}
              className="mx-4 mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium"
            >
              <Volume2 className="h-4 w-4" />
              Tap to enable audio
            </button>
          ) : null}

          <ul className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {(participants.length > 0
              ? participants
              : [
                  {
                    userId: localUserId,
                    name: currentUser?.name ?? "You",
                    avatarUrl: currentUser?.avatarUrl ?? null,
                    isMuted: muted,
                    speaking: false,
                  },
                ]
            ).map((p) => (
              <li
                key={p.userId}
                className={`mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  p.speaking
                    ? "border-brand-secondary/60 bg-brand-primary/20 ring-2 ring-brand-secondary/40"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-bold ${
                    p.speaking ? "scale-105" : ""
                  }`}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.userId === localUserId ? "You" : p.name}
                    {p.userId === room.hostId ? " · Host" : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.isMuted
                      ? "Muted"
                      : p.speaking
                        ? "Speaking"
                        : "Connected"}
                  </p>
                </div>
                {p.speaking ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-secondary" />
                ) : null}
              </li>
            ))}
          </ul>

          <footer className="safe-area-bottom shrink-0 border-t border-white/10 px-4 pb-6 pt-4">
            <div className="mx-auto flex max-w-md items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => void handleToggleMute()}
                aria-label={muted ? "Unmute" : "Mute"}
                className={`flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full ${
                  muted
                    ? "bg-red-500/90 text-white"
                    : "bg-white/15 text-white"
                }`}
              >
                {muted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleLeave()}
                className="flex h-14 min-h-[44px] flex-1 max-w-[10rem] items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-sm font-semibold text-white"
              >
                <PhoneOff className="h-5 w-5" />
                Leave
              </button>

              {canEndRoom || isHost ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleEnd()}
                  className="flex h-14 min-h-[44px] items-center justify-center rounded-full border border-white/25 px-4 text-xs font-semibold uppercase tracking-wide"
                >
                  End
                </button>
              ) : null}
            </div>
          </footer>
        </div>
      ) : null}
    </>
  );
}
