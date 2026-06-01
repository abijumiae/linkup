"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  endLiveTalk,
  fetchLiveTalkMessages,
  joinLiveTalk,
  leaveLiveTalk,
  LiveTalkMessage,
  LiveTalkRoom,
  postLiveTalkMessage,
  setLiveTalkHand,
  setLiveTalkMuted,
  startLiveTalk,
} from "@/src/lib/groupLiveTalk";
import {
  GroupLiveTalkSession,
  LiveTalkSocketParticipant,
} from "@/src/lib/groupLiveTalkSession";
import { useSocket } from "@/src/components/SocketProvider";
import { useOnlinePresence } from "@/src/lib/OnlinePresenceProvider";

export type LiveTalkParticipantView = LiveTalkSocketParticipant & {
  speaking?: boolean;
  isHost?: boolean;
  role?: string | null;
};

export type UseGroupLiveTalkOptions = {
  groupId: string;
  activeRoom: LiveTalkRoom | null;
  hostId?: string;
  onRoomChange: (room: LiveTalkRoom | null) => void;
};

export function useGroupLiveTalk({
  groupId,
  activeRoom,
  hostId,
  onRoomChange,
}: UseGroupLiveTalkOptions) {
  const { socket, isConnected } = useSocket();
  const { isUserOnline } = useOnlinePresence();
  const currentUser = getCurrentUser();
  const localUserId = currentUser?.id ?? "";

  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [participants, setParticipants] = useState<LiveTalkParticipantView[]>(
    [],
  );
  const [messages, setMessages] = useState<LiveTalkMessage[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");

  const sessionRef = useRef<GroupLiveTalkSession | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const room = activeRoom?.status === "ACTIVE" ? activeRoom : null;
  const isHost = room?.hostId === localUserId;

  const syncParticipantsFromRoom = useCallback(
    (r: LiveTalkRoom) => {
      setParticipants(
        r.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
          isMuted: p.isMuted,
          handRaised: p.handRaised ?? false,
          isHost: p.userId === r.hostId,
        })),
      );
    },
    [],
  );

  useEffect(() => {
    if (room) {
      syncParticipantsFromRoom(room);
    } else {
      setParticipants([]);
      setInRoom(false);
      setMessages([]);
    }
  }, [room, syncParticipantsFromRoom]);

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
    setHandRaised(false);
    setPushToTalk(false);
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
    const { fetchActiveLiveTalk } = await import("@/src/lib/groupLiveTalk");
    try {
      const next = await fetchActiveLiveTalk(groupId);
      onRoomChange(next);
    } catch {
      onRoomChange(null);
    }
  }, [groupId, onRoomChange]);

  const loadMessages = useCallback(
    async (roomId: string) => {
      try {
        const list = await fetchLiveTalkMessages(groupId, roomId);
        setMessages(list);
      } catch {
        setMessages([]);
      }
    },
    [groupId],
  );

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

    const onMessage = (payload: {
      groupId: string;
      roomId: string;
      message: LiveTalkMessage;
    }) => {
      if (payload.groupId !== groupId || payload.roomId !== room.id) {
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) {
          return prev;
        }
        return [...prev, payload.message];
      });
    };

    socket.on("live_talk_started", onStarted);
    socket.on("live_talk_ended", onEnded);
    socket.on("live_talk_message", onMessage);

    return () => {
      socket.off("live_talk_started", onStarted);
      socket.off("live_talk_ended", onEnded);
      socket.off("live_talk_message", onMessage);
    };
  }, [socket, room, groupId, onRoomChange, teardownSession]);

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
        await loadMessages(r.id);

        const session = new GroupLiveTalkSession({
          socket,
          localUserId,
          groupId,
          roomId: r.id,
          onRemoteStream: (userId, stream) => {
            void attachRemoteStream(userId, stream);
          },
          onRemoteRemoved: (userId) => {
            audioElementsRef.current.get(userId)?.pause();
            audioElementsRef.current.delete(userId);
            setParticipants((prev) => prev.filter((p) => p.userId !== userId));
          },
          onParticipants: (list) => {
            setParticipants(
              list.map((p) => ({
                ...p,
                isHost: p.userId === joined.hostId,
              })),
            );
          },
          onParticipantJoined: (p) => {
            setParticipants((prev) => {
              if (prev.some((x) => x.userId === p.userId)) {
                return prev;
              }
              return [
                ...prev,
                { ...p, isHost: p.userId === joined.hostId },
              ];
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
            if (userId === localUserId) {
              setMuted(isMuted);
            }
          },
          onHandChanged: (userId, raised) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.userId === userId ? { ...p, handRaised: raised } : p,
              ),
            );
            if (userId === localUserId) {
              setHandRaised(raised);
            }
          },
          onSpeaking: (userId, speaking) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.userId === userId ? { ...p, speaking } : p,
              ),
            );
          },
          onRemoteSpeaking: (userId, speaking) => {
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
      loadMessages,
      attachRemoteStream,
      teardownSession,
      refreshActiveRoom,
    ],
  );

  const start = async () => {
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

  const join = async () => {
    if (!room) {
      return;
    }
    await enterAudioSession(room);
  };

  const leave = async () => {
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

  const end = async () => {
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

  const toggleMute = async () => {
    if (!room) {
      return;
    }
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
    try {
      await setLiveTalkMuted(groupId, room.id, next);
    } catch {
      setError("Could not update mute state.");
    }
  };

  const toggleHand = async () => {
    if (!room) {
      return;
    }
    const next = !handRaised;
    setHandRaised(next);
    if (socket) {
      socket.emit("live_talk_hand_changed", {
        groupId,
        roomId: room.id,
        handRaised: next,
      });
    }
    try {
      await setLiveTalkHand(groupId, room.id, next);
    } catch {
      setHandRaised(!next);
      setError("Could not update raise hand.");
    }
  };

  const sendMessage = async () => {
    if (!room || !messageDraft.trim()) {
      return;
    }
    const text = messageDraft.trim();
    setMessageDraft("");
    try {
      if (socket && inRoom) {
        socket.emit("live_talk_message", {
          groupId,
          roomId: room.id,
          content: text,
        });
      } else {
        const msg = await postLiveTalkMessage(groupId, room.id, text);
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      setError("Could not send message.");
      setMessageDraft(text);
    }
  };

  const pushToTalkStart = () => {
    setPushToTalk(true);
    sessionRef.current?.setPushToTalk(true);
  };

  const pushToTalkEnd = () => {
    setPushToTalk(false);
    sessionRef.current?.setPushToTalk(false);
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

  const participantCount =
    inRoom && participants.length > 0
      ? participants.length
      : room?.participants.length ?? 0;

  return {
    room,
    inRoom,
    loading,
    error,
    info,
    muted,
    handRaised,
    pushToTalk,
    participants,
    messages,
    needsAudioUnlock,
    messageDraft,
    setMessageDraft,
    isHost,
    isUserOnline,
    localUserId,
    currentUser,
    participantCount,
    isConnected,
    start,
    join,
    leave,
    end,
    toggleMute,
    toggleHand,
    sendMessage,
    pushToTalkStart,
    pushToTalkEnd,
    unlockAudio,
    hostId: hostId ?? room?.hostId,
  };
}
