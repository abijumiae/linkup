"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  clearLiveTalkHand,
  endLiveTalk,
  fetchLiveTalkMessages,
  fetchLiveTalkStatus,
  forceReleaseLiveTalkMic,
  grantLiveTalkTempAdmin,
  joinLiveTalk,
  leaveLiveTalk,
  LiveTalkAuthError,
  LiveTalkMessage,
  LiveTalkRoom,
  lowerLiveTalkHand,
  muteLiveTalkParticipant,
  openLiveTalkMic,
  passLiveTalkMic,
  postLiveTalkMessage,
  raiseLiveTalkHand,
  releaseLiveTalkMic,
  removeLiveTalkParticipant,
  removeLiveTalkTempAdmin,
  setLiveTalkMuted,
  startLiveTalk,
  transferLiveTalkHost,
} from "@/src/lib/groupLiveTalk";
import {
  GroupLiveTalkSession,
  LiveTalkSocketParticipant,
} from "@/src/lib/groupLiveTalkSession";
import { ltDebug } from "@/src/lib/webrtcConfig";
import { useSocket } from "@/src/components/SocketProvider";
import { useOnlinePresence } from "@/src/lib/OnlinePresenceProvider";

export type LiveTalkParticipantView = LiveTalkSocketParticipant & {
  speaking?: boolean;
  isHost?: boolean;
  groupRole?: string;
  liveRole?: string;
  isTempAdmin?: boolean;
};

export type LiveTalkAudioStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "needs_unlock"
  | "failed";

export type UseGroupLiveTalkOptions = {
  groupId: string;
  activeRoom: LiveTalkRoom | null;
  hostId?: string;
  canStart?: boolean;
  canHostControls?: boolean;
  canGrantRoomAdmin?: boolean;
  onRoomChange: (room: LiveTalkRoom | null) => void;
};

export function useGroupLiveTalk({
  groupId,
  activeRoom,
  hostId,
  canStart = true,
  canHostControls = false,
  canGrantRoomAdmin = false,
  onRoomChange,
}: UseGroupLiveTalkOptions) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { isUserOnline } = useOnlinePresence();
  const currentUser = getCurrentUser();
  const localUserId = currentUser?.id ?? "";

  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [participants, setParticipants] = useState<LiveTalkParticipantView[]>(
    [],
  );
  const [messages, setMessages] = useState<LiveTalkMessage[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [audioStatus, setAudioStatus] = useState<LiveTalkAudioStatus>("idle");
  const [messageDraft, setMessageDraft] = useState("");
  const [micPassedPrompt, setMicPassedPrompt] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);

  const sessionRef = useRef<GroupLiveTalkSession | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const room = activeRoom?.status === "ACTIVE" ? activeRoom : null;
  const isHost = room?.hostId === localUserId;
  const selfInRoom = room?.participants.find(
    (p) => p.userId === localUserId && !p.leftAt,
  );
  const isRoomAdmin = Boolean(selfInRoom?.isTempAdmin);
  const canUseHostControls = canHostControls || isHost || isRoomAdmin;
  const canGrantTempAdmin = canGrantRoomAdmin || isHost;
  const activeMicUserId = room?.activeMicUserId ?? null;
  const holdingMic = Boolean(activeMicUserId && activeMicUserId === localUserId);
  const micBusy = Boolean(activeMicUserId && !holdingMic);
  const micHolderName =
    room?.activeMicUser?.name ??
    participants.find((p) => p.userId === activeMicUserId)?.name ??
    null;
  const micAvailable = !activeMicUserId;

  const syncParticipantsFromRoom = useCallback((r: LiveTalkRoom) => {
    setParticipants(
      r.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        isMuted: p.isMuted,
        handRaised: p.handRaised ?? false,
        isHost: p.userId === r.hostId,
        groupRole: p.groupRole,
        liveRole: p.liveRole,
        isTempAdmin: p.isTempAdmin ?? false,
      })),
    );
  }, []);

  const applyRoomUpdate = useCallback(
    (next: LiveTalkRoom | null) => {
      onRoomChange(next);
      if (next) {
        syncParticipantsFromRoom(next);
      }
    },
    [onRoomChange, syncParticipantsFromRoom],
  );

  useEffect(() => {
    if (room) {
      syncParticipantsFromRoom(room);
      const self = room.participants.find((p) => p.userId === localUserId);
      if (self) {
        setHandRaised(self.handRaised);
        setMuted(self.isMuted);
      }
      sessionRef.current?.setActiveMicHolder(room.activeMicUserId);
    } else {
      setParticipants([]);
      setInRoom(false);
      setMessages([]);
      setMuted(true);
      setHandRaised(false);
    }
  }, [room, syncParticipantsFromRoom, localUserId]);

  useEffect(() => {
    if (!holdingMic || !room?.activeMicStartedAt) {
      return;
    }
    const started = new Date(room.activeMicStartedAt).getTime();
    if (Number.isNaN(started)) {
      return;
    }
    const warnMs = 5 * 60 * 1000;
    const delay = Math.max(0, warnMs - (Date.now() - started));
    const timer = window.setTimeout(() => {
      setInfo("You have held the mic for 5 minutes.");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [holdingMic, room?.activeMicStartedAt]);

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
    setMuted(true);
    setAudioStatus("idle");
    setNeedsAudioUnlock(false);
  }, []);

  const attachRemoteStream = useCallback(
    async (userId: string, stream: MediaStream) => {
      setAudioStatus("connecting");
      let audio = audioElementsRef.current.get(userId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        audioElementsRef.current.set(userId, audio);
      }
      audio.srcObject = stream;
      const tracks = stream.getAudioTracks();
      ltDebug("remote stream attached", {
        userId,
        tracks: tracks.length,
        enabled: tracks[0]?.enabled ?? false,
      });
      try {
        await audio.play();
        setNeedsAudioUnlock(false);
        setAudioStatus("connected");
        setInfo((prev) =>
          prev?.includes("Tap to enable audio") ? "Listening to room" : prev,
        );
      } catch {
        setNeedsAudioUnlock(true);
        setAudioStatus("needs_unlock");
        setInfo("Tap to enable audio");
      }
    },
    [],
  );

  const handleLiveTalkError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof LiveTalkAuthError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : fallback);
    },
    [router],
  );

  const refreshActiveRoom = useCallback(async () => {
    try {
      const status = await fetchLiveTalkStatus(groupId);
      onRoomChange(status.room);
      if (status.speakingUserIds.length > 0) {
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            speaking: status.speakingUserIds.includes(p.userId),
          })),
        );
      }
    } catch (err) {
      if (err instanceof LiveTalkAuthError) {
        router.replace("/login");
        return;
      }
      onRoomChange(null);
    }
  }, [groupId, onRoomChange, router]);

  const applySpeaking = useCallback((userId: string, speaking: boolean) => {
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, speaking } : p)),
    );
  }, []);

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
    if (!socket || !isConnected) {
      return;
    }

    socket.emit("join_group_chat", { groupId });

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

    const onJoined = (payload: { groupId: string; userId: string }) => {
      if (payload.groupId === groupId) {
        void refreshActiveRoom();
      }
    };

    const onLeft = (payload: { groupId: string; userId: string }) => {
      if (payload.groupId === groupId) {
        void refreshActiveRoom();
      }
    };

    const onSpeaking = (payload: {
      groupId: string;
      userId: string;
      speaking: boolean;
    }) => {
      if (payload.groupId === groupId) {
        applySpeaking(payload.userId, payload.speaking);
      }
    };

    const onMicOpened = (payload: {
      groupId: string;
      roomId: string;
      userId?: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.room) {
        onRoomChange(payload.room);
        sessionRef.current?.setActiveMicHolder(
          payload.room.activeMicUserId ?? payload.userId ?? null,
        );
      } else {
        void refreshActiveRoom();
      }
      const speakerId =
        payload.room?.activeMicUserId ?? payload.userId ?? null;
      if (speakerId === localUserId) {
        setInfo("You are speaking");
      } else if (speakerId) {
        setAudioStatus("connecting");
        setInfo(
          payload.room?.activeMicUser
            ? `Connecting audio — ${payload.room.activeMicUser.name} is speaking`
            : "Connecting audio…",
        );
      }
    };

    const onMicReleased = (payload: {
      groupId: string;
      userId?: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.userId === localUserId) {
        sessionRef.current?.releaseMicAudio();
        setMuted(true);
      }
      if (payload.room) {
        applyRoomUpdate(payload.room);
      } else {
        void refreshActiveRoom();
      }
      setInfo("Mic is available");
    };

    const onMicBusy = (payload: {
      groupId: string;
      activeMicUserName?: string;
      message?: string;
    }) => {
      if (payload.groupId === groupId) {
        setError(
          payload.activeMicUserName
            ? `Mic is in use by ${payload.activeMicUserName}`
            : payload.message ?? "Mic is already in use.",
        );
      }
    };

    const onMicPassed = (payload: {
      groupId: string;
      toUserId?: string;
      room?: LiveTalkRoom;
      requiresUserAction?: boolean;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.room) {
        applyRoomUpdate(payload.room);
      }
      if (
        payload.toUserId === localUserId &&
        payload.requiresUserAction !== false
      ) {
        setMicPassedPrompt(true);
        setInfo("Host passed the mic to you. Tap Open Mic when you are ready.");
      }
    };

    const onRoomUpdated = (payload: {
      groupId: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId === groupId && payload.room) {
        applyRoomUpdate(payload.room);
      }
    };

    const onHostChanged = (payload: {
      groupId: string;
      roomId: string;
      oldHostId: string;
      newHostId: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.room) {
        applyRoomUpdate(payload.room);
      } else {
        void refreshActiveRoom();
      }
      const newName =
        payload.room?.host?.name ??
        payload.room?.participants.find((p) => p.userId === payload.newHostId)
          ?.user.name;
      if (payload.newHostId === localUserId) {
        setInfo("You are now hosting Live Talk.");
      } else {
        setInfo(
          newName
            ? `Host changed — ${newName} is now hosting.`
            : "Host changed.",
        );
      }
    };

    const onParticipantRemoved = (payload: {
      groupId: string;
      userId: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.userId === localUserId) {
        sessionRef.current?.releaseMicAudio();
        teardownSession();
        setError("You were removed from Live Talk.");
        setMicPassedPrompt(false);
      }
      if (payload.room) {
        applyRoomUpdate(payload.room);
      } else {
        void refreshActiveRoom();
      }
    };

    socket.on("live_talk_started", onStarted);
    socket.on("live_talk_ended", onEnded);
    socket.on("user_joined_liveTalk", onJoined);
    socket.on("user_left_liveTalk", onLeft);
    socket.on("user_speaking", onSpeaking);
    socket.on("live_talk_mic_opened", onMicOpened);
    socket.on("live_talk_mic_released", onMicReleased);
    socket.on("live_talk_mic_busy", onMicBusy);
    socket.on("live_talk_mic_passed", onMicPassed);
    socket.on("live_talk_room_updated", onRoomUpdated);
    socket.on("live_talk_host_changed", onHostChanged);
    socket.on("live_talk_participant_removed", onParticipantRemoved);

    const onTempAdminChanged = (payload: {
      groupId: string;
      roomId?: string;
      room?: LiveTalkRoom;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      if (payload.room) {
        applyRoomUpdate(payload.room);
      } else {
        void refreshActiveRoom();
      }
    };

    socket.on("live_talk_temp_admin_added", onTempAdminChanged);
    socket.on("live_talk_temp_admin_removed", onTempAdminChanged);

    return () => {
      socket.off("live_talk_started", onStarted);
      socket.off("live_talk_ended", onEnded);
      socket.off("user_joined_liveTalk", onJoined);
      socket.off("user_left_liveTalk", onLeft);
      socket.off("user_speaking", onSpeaking);
      socket.off("live_talk_mic_opened", onMicOpened);
      socket.off("live_talk_mic_released", onMicReleased);
      socket.off("live_talk_mic_busy", onMicBusy);
      socket.off("live_talk_mic_passed", onMicPassed);
      socket.off("live_talk_room_updated", onRoomUpdated);
      socket.off("live_talk_host_changed", onHostChanged);
      socket.off("live_talk_participant_removed", onParticipantRemoved);
      socket.off("live_talk_temp_admin_added", onTempAdminChanged);
      socket.off("live_talk_temp_admin_removed", onTempAdminChanged);
    };
  }, [
    socket,
    isConnected,
    groupId,
    localUserId,
    onRoomChange,
    teardownSession,
    refreshActiveRoom,
    applySpeaking,
    applyRoomUpdate,
  ]);

  useEffect(() => {
    if (!socket || !room) {
      return;
    }

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

    socket.on("live_talk_message", onMessage);

    return () => {
      socket.off("live_talk_message", onMessage);
    };
  }, [socket, room, groupId]);

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
            if (audioElementsRef.current.size === 0) {
              setAudioStatus("idle");
            }
          },
          onAudioConnecting: () => {
            setAudioStatus("connecting");
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
          onMicOpened: (userId) => {
            if (userId === localUserId) {
              setInfo("You are speaking");
            }
          },
          onMicReleased: () => {
            setMuted(true);
          },
          onConnected: () => {
            setInRoom(true);
            setInfo(
              joined.activeMicUserId
                ? joined.activeMicUser
                  ? `Mic in use by ${joined.activeMicUser.name}`
                  : "Mic is in use"
                : "Mic is available — tap Open Mic to speak",
            );
            session.setActiveMicHolder(joined.activeMicUserId);
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
        setMuted(true);
      } catch (err) {
        handleLiveTalkError(err, "Could not join Live Talk. Please try again.");
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
      handleLiveTalkError,
    ],
  );

  const start = async () => {
    if (!canStart) {
      setError("Only the hub host or moderators can start Live Talk.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await startLiveTalk(groupId);
      onRoomChange(created);
      await enterAudioSession(created);
    } catch (err) {
      handleLiveTalkError(err, "Could not start Live Talk. Please try again.");
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

  const openMic = async () => {
    if (!room) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sessionRef.current?.openMicAudio();
      const updated = await openLiveTalkMic(groupId, room.id);
      onRoomChange(updated);
      sessionRef.current?.setActiveMicHolder(
        updated.activeMicUserId ?? localUserId,
      );
      setMuted(false);
      setHandRaised(false);
      setInfo("You are speaking");
      ltDebug("open mic complete", {
        tracks: sessionRef.current?.getLocalStream()?.getAudioTracks().length,
      });
    } catch (err) {
      sessionRef.current?.releaseMicAudio();
      const message =
        err instanceof Error ? err.message : "Could not open mic.";
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || "Mic is already in use.");
      } else if (
        message.includes("permission") ||
        message.includes("microphone") ||
        message.includes("browser") ||
        message.includes("HTTPS")
      ) {
        setError(message);
      } else {
        handleLiveTalkError(err, message);
      }
    } finally {
      setLoading(false);
    }
  };

  const releaseMic = async () => {
    if (!room) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      sessionRef.current?.releaseMicAudio();
      const updated = await releaseLiveTalkMic(groupId, room.id);
      onRoomChange(updated);
      setMuted(true);
      setInfo("Mic is available");
    } catch (err) {
      handleLiveTalkError(err, "Could not release mic.");
    } finally {
      setLoading(false);
    }
  };

  const leave = async () => {
    if (!room) {
      teardownSession();
      return;
    }
    setLoading(true);
    try {
      if (holdingMic) {
        try {
          await releaseLiveTalkMic(groupId, room.id);
        } catch {
          // Best-effort before leaving.
        }
      }
      const updated = await leaveLiveTalk(groupId, room.id);
      sessionRef.current?.leave(true);
      teardownSession();
      if (updated) {
        onRoomChange(updated);
      } else {
        onRoomChange(null);
      }
      await refreshActiveRoom();
      setInfo("You left Live Talk.");
    } catch (err) {
      handleLiveTalkError(err, "Could not leave Live Talk.");
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
      handleLiveTalkError(err, "Could not end Live Talk.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = async () => {
    if (!room || !holdingMic) {
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
    try {
      if (next) {
        await raiseLiveTalkHand(groupId, room.id);
      } else {
        await lowerLiveTalkHand(groupId, room.id);
      }
    } catch (err) {
      setHandRaised(!next);
      handleLiveTalkError(err, "Could not update raise hand.");
    }
  };

  const sendRoomMessage = async (raw: string) => {
    if (!room) {
      return;
    }
    const text = raw.trim();
    if (!text) {
      return;
    }
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
      throw new Error("send failed");
    }
  };

  const sendMessage = async () => {
    if (!messageDraft.trim()) {
      return;
    }
    const text = messageDraft.trim();
    setMessageDraft("");
    try {
      await sendRoomMessage(text);
    } catch {
      setMessageDraft(text);
    }
  };

  const sendQuickReaction = async (emoji: string) => {
    const safe = emoji?.trim();
    if (!safe) {
      return;
    }
    try {
      await sendRoomMessage(safe);
    } catch {
      /* error already set */
    }
  };

  const acceptPassedMic = async () => {
    setMicPassedPrompt(false);
    await openMic();
  };

  const forceReleaseMic = async () => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await forceReleaseLiveTalkMic(groupId, room.id);
      applyRoomUpdate(updated);
      setInfo("Mic released by host");
    } catch (err) {
      handleLiveTalkError(err, "Could not force release mic.");
    } finally {
      setLoading(false);
    }
  };

  const passMicTo = async (targetUserId: string) => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await passLiveTalkMic(groupId, room.id, targetUserId);
      applyRoomUpdate(updated);
      setInfo("Mic passed to participant");
    } catch (err) {
      handleLiveTalkError(err, "Could not pass mic.");
    } finally {
      setLoading(false);
    }
  };

  const muteParticipant = async (targetUserId: string, nextMuted: boolean) => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    try {
      const updated = await muteLiveTalkParticipant(
        groupId,
        room.id,
        targetUserId,
        nextMuted,
      );
      applyRoomUpdate(updated);
    } catch (err) {
      handleLiveTalkError(err, "Could not update participant mute.");
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (targetUserId: string) => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    try {
      const updated = await removeLiveTalkParticipant(
        groupId,
        room.id,
        targetUserId,
      );
      if (updated) {
        applyRoomUpdate(updated);
      } else {
        onRoomChange(null);
        setInfo("Live Talk ended.");
      }
    } catch (err) {
      handleLiveTalkError(err, "Could not remove participant.");
    } finally {
      setLoading(false);
    }
  };

  const transferHostTo = async (targetUserId: string) => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await transferLiveTalkHost(
        groupId,
        room.id,
        targetUserId,
      );
      applyRoomUpdate(updated);
    } catch (err) {
      handleLiveTalkError(err, "Could not transfer host.");
    } finally {
      setLoading(false);
    }
  };

  const clearParticipantHand = async (targetUserId: string) => {
    if (!room || !canUseHostControls) {
      return;
    }
    setLoading(true);
    try {
      const updated = await clearLiveTalkHand(groupId, room.id, targetUserId);
      applyRoomUpdate(updated);
    } catch (err) {
      handleLiveTalkError(err, "Could not clear raised hand.");
    } finally {
      setLoading(false);
    }
  };

  const grantRoomAdmin = async (targetUserId: string) => {
    if (!room || !canGrantTempAdmin) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await grantLiveTalkTempAdmin(
        groupId,
        room.id,
        targetUserId,
      );
      applyRoomUpdate(updated);
      setInfo("Room admin added");
    } catch (err) {
      handleLiveTalkError(err, "Could not add room admin.");
    } finally {
      setLoading(false);
    }
  };

  const removeRoomAdmin = async (targetUserId: string) => {
    if (!room || !canGrantTempAdmin) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await removeLiveTalkTempAdmin(
        groupId,
        room.id,
        targetUserId,
      );
      applyRoomUpdate(updated);
      setInfo("Room admin removed");
    } catch (err) {
      handleLiveTalkError(err, "Could not remove room admin.");
    } finally {
      setLoading(false);
    }
  };

  const unlockAudio = async () => {
    let played = false;
    for (const audio of audioElementsRef.current.values()) {
      try {
        await audio.play();
        played = true;
      } catch {
        // continue
      }
    }
    if (played) {
      setNeedsAudioUnlock(false);
      setAudioStatus("connected");
      setInfo("Listening to room");
    } else {
      setAudioStatus("failed");
      setError("Could not start audio playback. Check device volume.");
    }
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
    holdingMic,
    micBusy,
    micAvailable,
    micHolderName,
    activeMicUserId,
    participants,
    messages,
    needsAudioUnlock,
    audioStatus,
    messageDraft,
    setMessageDraft,
    isHost,
    isUserOnline,
    localUserId,
    currentUser,
    participantCount,
    isConnected,
    canStart,
    canHostControls: canUseHostControls,
    canGrantRoomAdmin: canGrantTempAdmin,
    isRoomAdmin,
    raisedHands: room?.raisedHands ?? [],
    micPassedPrompt,
    setMicPassedPrompt,
    hostPanelOpen,
    setHostPanelOpen,
    start,
    join,
    openMic,
    releaseMic,
    acceptPassedMic,
    forceReleaseMic,
    passMicTo,
    muteParticipant,
    removeParticipant,
    clearParticipantHand,
    transferHostTo,
    grantRoomAdmin,
    removeRoomAdmin,
    leave,
    end,
    toggleMute,
    toggleHand,
    sendMessage,
    sendQuickReaction,
    unlockAudio,
    hostId: hostId ?? room?.hostId,
  };
}
