"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Radio,
  Search,
  Send,
  Smile,
  Users,
  Video,
} from "lucide-react";
import { ApiError, getApiBaseUrl } from "@/src/lib/api";
import { getCurrentUser, getToken } from "@/src/lib/auth";
import {
  getSocket,
  hasAuthToken,
  isSocketConnected,
  toMessageReceivedPayload,
  TypingPayload,
} from "@/src/lib/socket";
import { useSocket } from "@/src/components/SocketProvider";
import { useOnlinePresence } from "@/src/lib/OnlinePresenceProvider";
import { useActiveChat } from "@/src/lib/ActiveChatContext";
import {
  GroupChatMessage,
  GroupChatSummary,
  fetchGroupChats,
  fetchGroupConversation,
  sendGroupMessage,
} from "@/src/lib/groupMessages";
import {
  ChatMessage,
  Conversation,
  fetchConversation,
  fetchConversations,
  getMessagePreview,
  sendMessage,
  sendVoiceMessage,
} from "@/src/lib/messages";
import VoiceNoteRecorder, {
  isVoiceRecordingSupported,
} from "@/src/components/VoiceNoteRecorder";
import ChatSafetyMenu from "../../components/ChatSafetyMenu";
import { fetchBlockStatus, type BlockStatus } from "@/src/lib/safety";
import { formatTimeAgo } from "@/src/lib/posts";
import {
  CallSession,
  CallType,
  IncomingCallPayload,
  isWebRTCSupported,
} from "@/src/lib/webrtc";
import {
  GroupCallParticipant,
  GroupCallSession,
} from "@/src/lib/groupWebrtc";
import ChatListItem from "../../components/ChatListItem";
import UserAvatar from "../../components/UserAvatar";
import OnlineStatusBadge from "../../components/OnlineStatusBadge";
import EmojiPicker from "../../components/EmojiPicker";
import LiveRoomCard from "../../components/LiveRoomCard";
import MessageBubble from "../../components/MessageBubble";
import { getChatInitialsClass, getChatRingClass } from "@/src/lib/chatColors";
import ChatsEmptyState from "../../components/messages/ChatsEmptyState";
import NewChatModal from "../../components/messages/NewChatModal";
import {
  ChatsListSkeleton,
  ChatsThreadSkeleton,
} from "../../components/messages/ChatsSkeleton";

const CallOverlay = dynamic(() => import("../../components/CallOverlay"), {
  ssr: false,
});
const GroupCallOverlay = dynamic(
  () => import("../../components/GroupCallOverlay"),
  { ssr: false },
);

type ChatTab = "direct" | "group" | "live";

const LIVE_PLACEHOLDER_ROOMS = [
  {
    title: "Live Hub Chat",
    subtitle: "Real-time conversations when your hub goes live.",
  },
  {
    title: "Event Live Room",
    subtitle: "Join happening rooms during events and meetups.",
  },
  {
    title: "Work Room",
    subtitle: "Collaborate live with your project crew.",
  },
] as const;

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

function directRoomName(userA: string, userB: string): string {
  return `direct:${[userA, userB].sort().join(":")}`;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("userId");
  const selectedGroupId = searchParams.get("groupId");
  const listingId = searchParams.get("listingId");
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const marketplaceInquirySentRef = useRef(false);

  const [chatTab, setChatTab] = useState<ChatTab>(
    selectedGroupId ? "group" : "direct",
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const [activeUser, setActiveUser] = useState<Conversation["user"] | null>(
    null,
  );
  const [activeGroup, setActiveGroup] = useState<
    GroupChatSummary["group"] | null
  >(null);
  const [activeGroupMemberCount, setActiveGroupMemberCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingPeerId, setTypingPeerId] = useState<string | null>(null);
  const [typingGroupId, setTypingGroupId] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [joinedDirectRoom, setJoinedDirectRoom] = useState<string | null>(null);
  const { socket, status: socketStatus } = useSocket();
  const { isUserOnline } = useOnlinePresence();
  const { setActiveChatPeerId } = useActiveChat();
  const activeUserRef = useRef(activeUser);
  const activeGroupRef = useRef(activeGroup);
  activeUserRef.current = activeUser;
  activeGroupRef.current = activeGroup;
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "active" | "incoming" | null
  >(null);
  const [callPeerId, setCallPeerId] = useState<string | null>(null);
  const [callPeerName, setCallPeerName] = useState<string>("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callAudioEnabled, setCallAudioEnabled] = useState(true);
  const [callVideoEnabled, setCallVideoEnabled] = useState(true);
  const callSessionRef = useRef<CallSession | null>(null);
  const incomingCallRef = useRef<IncomingCallPayload | null>(null);
  const groupCallSessionRef = useRef<GroupCallSession | null>(null);
  const [groupCallType, setGroupCallType] = useState<CallType | null>(null);
  const [groupCallStatus, setGroupCallStatus] = useState<
    "connecting" | "active" | null
  >(null);
  const [groupCallParticipants, setGroupCallParticipants] = useState<
    GroupCallParticipant[]
  >([]);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [groupLocalStream, setGroupLocalStream] = useState<MediaStream | null>(
    null,
  );
  const [groupCallAudioEnabled, setGroupCallAudioEnabled] = useState(true);
  const [groupCallVideoEnabled, setGroupCallVideoEnabled] = useState(true);
  const [activeGroupCallLive, setActiveGroupCallLive] = useState(false);
  const [activeGroupCallType, setActiveGroupCallType] = useState<CallType>("audio");
  const [isInGroupCall, setIsInGroupCall] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<{ key: string; count: number }>({
    key: "",
    count: 0,
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const showFeatureNotice = useCallback((message: string | null) => {
    setNotice(message);
    if (!message) {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      return;
    }
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const resolvePeerName = useCallback(
    (userId: string) => {
      if (activeUser?.id === userId) {
        return activeUser.name;
      }
      const conversation = conversations.find((item) => item.user.id === userId);
      return conversation?.user.name ?? "LinkUp user";
    },
    [activeUser, conversations],
  );

  const resetGroupCallState = useCallback(() => {
    groupCallSessionRef.current = null;
    setIsInGroupCall(false);
    setGroupCallType(null);
    setGroupCallStatus(null);
    setGroupCallParticipants([]);
    setGroupRemoteStreams({});
    setGroupLocalStream(null);
    setGroupCallAudioEnabled(true);
    setGroupCallVideoEnabled(true);
  }, []);

  const resetCallState = useCallback(() => {
    callSessionRef.current = null;
    incomingCallRef.current = null;
    setCallType(null);
    setCallStatus(null);
    setCallPeerId(null);
    setCallPeerName("");
    setLocalStream(null);
    setRemoteStream(null);
    setCallAudioEnabled(true);
    setCallVideoEnabled(true);
  }, []);

  const leaveGroupCall = useCallback(() => {
    groupCallSessionRef.current?.leave(true);
    resetGroupCallState();
  }, [resetGroupCallState]);

  const endCall = useCallback(() => {
    callSessionRef.current?.end(true);
    resetCallState();
  }, [resetCallState]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return [];
      }
      setError("Chats are warming up. Try again shortly.");
      return [];
    }
  }, [router]);

  const loadGroupChats = useCallback(async () => {
    try {
      const data = await fetchGroupChats();
      setGroupChats(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return [];
      }
      return [];
    }
  }, [router]);

  const openConversation = useCallback(
    async (userId: string) => {
      const peerId = userId.trim();

      if (!peerId) {
        setError("Select a chat first");
        return;
      }

      if (peerId === currentUserId) {
        setError("You cannot message yourself");
        return;
      }

      setError(null);
      setChatTab("direct");

      try {
        const data = await fetchConversation(peerId);
        setActiveUser(data.user);
        setActiveGroup(null);
        setActiveGroupMemberCount(0);
        setMessages(data.messages);
        setGroupMessages([]);
        setMobileView("chat");
        setConversations((current) =>
          current.map((conversation) =>
            conversation.user.id === peerId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
        getSocket()?.emit("join_direct_chat", { otherUserId: peerId });
        if (process.env.NODE_ENV === "development") {
          console.log("Joining direct chat:", peerId);
        }
        if (currentUserId) {
          setJoinedDirectRoom(directRoomName(currentUserId, peerId));
        }
        getSocket()?.emit("join_chat", {
          chatType: "direct",
          targetId: peerId,
        });
        setTimeout(() => scrollToBottom("auto"), 50);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load chat. Please try again.",
        );
      }
    },
    [router, scrollToBottom, currentUserId],
  );

  const openGroupConversation = useCallback(
    async (groupId: string) => {
      setError(null);
      setChatTab("group");

      try {
        const [data, chats] = await Promise.all([
          fetchGroupConversation(groupId),
          fetchGroupChats(),
        ]);
        setGroupChats(chats);
        const summary = chats.find((c) => c.group.id === groupId);
        setActiveGroup(data.group);
        setActiveGroupMemberCount(summary?.membersCount ?? 0);
        setActiveUser(null);
        setGroupMessages(data.messages);
        setMessages([]);
        setActiveGroupCallLive(false);
        setMobileView("chat");
        getSocket()?.emit("join_group_chat", { groupId });
        getSocket()?.emit("join_chat", {
          chatType: "group",
          targetId: groupId,
        });
        setTimeout(() => scrollToBottom("auto"), 50);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load group chat. Please try again.",
        );
      }
    },
    [router, scrollToBottom],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError(null);
      const [list, groups] = await Promise.all([
        loadConversations(),
        loadGroupChats(),
      ]);

      if (cancelled) {
        return;
      }

      if (selectedGroupId) {
        await openGroupConversation(selectedGroupId);
      } else if (selectedUserId) {
        await openConversation(selectedUserId);
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, selectedGroupId]);

  useEffect(() => {
    if (!activeUser?.id) {
      setChatBlocked(false);
      setBlockedByMe(false);
      return;
    }

    void fetchBlockStatus(activeUser.id)
      .then((status) => {
        setBlockedByMe(status.blockedByMe);
        setChatBlocked(status.isBlocked);
      })
      .catch(() => {
        setChatBlocked(false);
        setBlockedByMe(false);
      });
  }, [activeUser?.id]);

  useEffect(() => {
    if (!socket || !activeUser?.id) {
      return;
    }

    const applyBlockStatus = (status: BlockStatus) => {
      setBlockedByMe(status.blockedByMe);
      setChatBlocked(status.isBlocked);
    };

    const onUserBlocked = (payload: { userId?: string }) => {
      if (payload.userId === activeUser.id) {
        void fetchBlockStatus(activeUser.id).then(applyBlockStatus);
      }
    };

    const onUserUnblocked = onUserBlocked;

    socket.on("user_blocked", onUserBlocked);
    socket.on("user_unblocked", onUserUnblocked);

    return () => {
      socket.off("user_blocked", onUserBlocked);
      socket.off("user_unblocked", onUserUnblocked);
    };
  }, [socket, activeUser?.id]);

  useEffect(() => {
    if (!socket?.connected || !activeUser?.id) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Joining direct chat:", activeUser.id);
    }
    socket.emit("join_direct_chat", { otherUserId: activeUser.id });
    if (currentUserId) {
      setJoinedDirectRoom(directRoomName(currentUserId, activeUser.id));
    }
    socket.emit("join_chat", {
      chatType: "direct",
      targetId: activeUser.id,
    });
  }, [socket, activeUser?.id, currentUserId]);

  useEffect(() => {
    if (chatTab !== "direct" || !activeUser?.id) {
      return;
    }

    if (socketStatus === "connected") {
      return;
    }

    let cancelled = false;
    const pollIntervalMs = 10_000;

    const pollMessages = async () => {
      if (cancelled || document.hidden) {
        return;
      }

      try {
        const data = await fetchConversation(activeUser.id);
        setMessages((current) => {
          const currentIds = new Set(current.map((item) => item.id));
          const hasNew = data.messages.some((item) => !currentIds.has(item.id));
          if (!hasNew && data.messages.length === current.length) {
            return current;
          }
          return data.messages;
        });
      } catch {
        // Polling is a fallback only; ignore transient errors.
      }
    };

    void pollMessages();
    const intervalId = window.setInterval(pollMessages, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [socketStatus, chatTab, activeUser?.id]);

  useEffect(() => {
    if (!currentUserId || !socket) {
      return;
    }

    const onConnect = () => {
      const peerId = activeUserRef.current?.id;
      const groupId = activeGroupRef.current?.id;

      if (peerId) {
        if (process.env.NODE_ENV === "development") {
          console.log("Joining direct chat:", peerId);
        }
        socket.emit("join_direct_chat", { otherUserId: peerId });
        if (currentUserId) {
          setJoinedDirectRoom(directRoomName(currentUserId, peerId));
        }
        socket.emit("join_chat", {
          chatType: "direct",
          targetId: peerId,
        });
      }
      if (groupId) {
        socket.emit("join_group_chat", { groupId });
        socket.emit("join_chat", {
          chatType: "group",
          targetId: groupId,
        });
      }
    };

    const applyIncomingMessage = (raw: unknown) => {
      const normalized = toMessageReceivedPayload(raw);
      if (!normalized) {
        return;
      }

      if (normalized.chatType === "direct") {
        const message = normalized.message;
        const peerId =
          message.senderId === currentUserId
            ? message.receiverId
            : message.senderId;
        const openPeerId = activeUserRef.current?.id;

        setConversations((current) => {
          const existing = current.find((c) => c.user.id === peerId);
          const user = existing?.user;
          if (!user) {
            void loadConversations();
            return current;
          }

          const updated: Conversation = {
            user,
            lastMessage: {
              id: message.id,
              content: getMessagePreview(message),
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            unreadCount:
              openPeerId === peerId || message.senderId === currentUserId
                ? 0
                : (existing?.unreadCount ?? 0) + 1,
          };

          return [
            updated,
            ...current.filter((c) => c.user.id !== peerId),
          ];
        });

        if (openPeerId === peerId) {
          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
              return current;
            }
            return [...current, message];
          });
          setTimeout(() => scrollToBottom("auto"), 50);
        }
        return;
      }

      const message = normalized.message;
      const openGroupId = activeGroupRef.current?.id;

      setGroupChats((current) => {
        const existing = current.find((c) => c.group.id === message.groupId);
        if (!existing) {
          void loadGroupChats();
          return current;
        }

        const updated: GroupChatSummary = {
          ...existing,
          lastMessage: message,
        };

        return [
          updated,
          ...current.filter((c) => c.group.id !== message.groupId),
        ];
      });

      if (openGroupId === message.groupId) {
        setGroupMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [...current, message];
        });
        setTimeout(() => scrollToBottom("auto"), 50);
      }
    };

    const onMessageError = (payload: { message?: string }) => {
      console.error("Socket message error:", payload);
      showFeatureNotice("Could not send message. Please try again.");
    };

    const onRead = (payload: { readerId: string; peerId: string }) => {
      if (activeUserRef.current?.id !== payload.peerId) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.senderId === currentUserId
            ? { ...message, read: true }
            : message,
        ),
      );
    };

    const onTyping = (payload: TypingPayload) => {
      if (payload.userId === currentUserId) {
        return;
      }

      if (
        payload.chatType === "group" &&
        activeGroupRef.current?.id === payload.targetId
      ) {
        setTypingGroupId(payload.isTyping ? payload.userId : null);
        return;
      }

      if (
        payload.chatType === "direct" &&
        activeUserRef.current?.id === payload.userId
      ) {
        setTypingPeerId(payload.isTyping ? payload.userId : null);
      }
    };

    const onCallOffer = (payload: {
      fromUserId: string;
      sdp?: RTCSessionDescriptionInit;
      offer?: RTCSessionDescriptionInit;
      callType?: CallType;
    }) => {
      if (callSessionRef.current || incomingCallRef.current) {
        getSocket()?.emit("call_end", { peerId: payload.fromUserId });
        return;
      }

      const sdp = payload.sdp ?? payload.offer;
      if (!sdp) {
        showFeatureNotice("Audio/video calling is getting ready.");
        return;
      }

      incomingCallRef.current = {
        fromUserId: payload.fromUserId,
        sdp,
        callType: payload.callType ?? "video",
      };
      setCallPeerId(payload.fromUserId);
      setCallPeerName(resolvePeerName(payload.fromUserId));
      setCallType(payload.callType ?? "video");
      setCallStatus("incoming");
    };

    const onCallRejected = (payload: { fromUserId: string }) => {
      if (
        callPeerId === payload.fromUserId ||
        incomingCallRef.current?.fromUserId === payload.fromUserId
      ) {
        showFeatureNotice("Call declined.");
        resetCallState();
      }
    };

    const onCallEnded = (payload: { fromUserId: string }) => {
      if (
        callPeerId === payload.fromUserId ||
        incomingCallRef.current?.fromUserId === payload.fromUserId
      ) {
        callSessionRef.current?.end(false);
        resetCallState();
      }
    };

    const onGroupCallUserJoined = (payload: {
      roomId: string;
      callType?: CallType;
    }) => {
      if (activeGroup?.id !== payload.roomId || groupCallSessionRef.current) {
        return;
      }
      setActiveGroupCallLive(true);
      if (payload.callType) {
        setActiveGroupCallType(payload.callType);
      }
    };

    const onGroupCallUserLeft = (payload: { roomId: string }) => {
      if (activeGroup?.id !== payload.roomId || groupCallSessionRef.current) {
        return;
      }
    };

    const onGroupCallEnded = (payload: { roomId: string }) => {
      if (activeGroup?.id === payload.roomId) {
        setActiveGroupCallLive(false);
      }
      if (groupCallSessionRef.current) {
        groupCallSessionRef.current.leave(false);
        resetGroupCallState();
      }
    };

    const onDirectMessageReceived = (raw: unknown) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Received direct_message_received:", raw);
      }
      applyIncomingMessage(raw);
    };

    const onJoinedDirectChat = (payload: { otherUserId: string }) => {
      if (currentUserId) {
        setJoinedDirectRoom(directRoomName(currentUserId, payload.otherUserId));
      }
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on("connect", onConnect);
    socket.on("message_received", applyIncomingMessage);
    socket.on("direct_message_received", onDirectMessageReceived);
    socket.on("joined_direct_chat", onJoinedDirectChat);
    socket.on("group_message_received", applyIncomingMessage);
    socket.on("new_message_notification", applyIncomingMessage);
    socket.on("message_error", onMessageError);
    socket.on("message:read", onRead);
    socket.on("typing", onTyping);
    socket.on("typing_update", onTyping);
    socket.on("call_offer", onCallOffer);
    socket.on("incoming_call", onCallOffer);
    socket.on("call_end", onCallEnded);
    socket.on("call_ended", onCallEnded);
    socket.on("call_rejected", onCallRejected);
    socket.on("call_reject", onCallRejected);
    socket.on("group_call_user_joined", onGroupCallUserJoined);
    socket.on("group_call_user_left", onGroupCallUserLeft);
    socket.on("group_call_ended", onGroupCallEnded);

    return () => {
      socket.off("connect", onConnect);
      socket.off("message_received", applyIncomingMessage);
      socket.off("direct_message_received", onDirectMessageReceived);
      socket.off("joined_direct_chat", onJoinedDirectChat);
      socket.off("group_message_received", applyIncomingMessage);
      socket.off("new_message_notification", applyIncomingMessage);
      socket.off("message_error", onMessageError);
      socket.off("message:read", onRead);
      socket.off("typing", onTyping);
      socket.off("typing_update", onTyping);
      socket.off("call_offer", onCallOffer);
      socket.off("incoming_call", onCallOffer);
      socket.off("call_end", onCallEnded);
      socket.off("call_ended", onCallEnded);
      socket.off("call_rejected", onCallRejected);
      socket.off("call_reject", onCallRejected);
      socket.off("group_call_user_joined", onGroupCallUserJoined);
      socket.off("group_call_user_left", onGroupCallUserLeft);
      socket.off("group_call_ended", onGroupCallEnded);
    };
  }, [
    currentUserId,
    loadConversations,
    loadGroupChats,
    resetCallState,
    resetGroupCallState,
    resolvePeerName,
    scrollToBottom,
    showFeatureNotice,
    socket,
  ]);

  useEffect(() => {
    return () => {
      callSessionRef.current?.end(false);
      groupCallSessionRef.current?.leave(false);
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (chatTab === "direct" && activeUser?.id) {
      setActiveChatPeerId(activeUser.id);
      return;
    }

    setActiveChatPeerId(null);
  }, [activeUser?.id, chatTab, setActiveChatPeerId]);

  useEffect(() => {
    marketplaceInquirySentRef.current = false;
  }, [selectedUserId, listingId]);

  useEffect(() => {
    const threadKey =
      chatTab === "direct"
        ? `direct:${activeUser?.id ?? ""}`
        : `group:${activeGroup?.id ?? ""}`;
    const messageCount =
      chatTab === "direct" ? messages.length : groupMessages.length;

    if (!threadKey.endsWith(":")) {
      if (threadScrollRef.current.key !== threadKey) {
        threadScrollRef.current = { key: threadKey, count: messageCount };
        scrollToBottom("auto");
        return;
      }

      if (messageCount > threadScrollRef.current.count) {
        scrollToBottom("smooth");
      }
      threadScrollRef.current.count = messageCount;
    }
  }, [
    chatTab,
    activeUser?.id,
    activeGroup?.id,
    messages.length,
    groupMessages.length,
    scrollToBottom,
  ]);

  const handleReplyToMessage = useCallback((quote: string) => {
    setMessageInput((current) =>
      current.trim() ? `${current}\n> ${quote}` : `> ${quote}`,
    );
  }, []);

  const handleMessageCopied = useCallback(() => {
    showFeatureNotice("Message copied");
  }, [showFeatureNotice]);

  async function handleSelectConversation(userId: string) {
    router.replace(`/messages?userId=${userId}`);
    await openConversation(userId);
  }

  async function handleSelectGroup(groupId: string) {
    router.replace(`/messages?groupId=${groupId}`);
    await openGroupConversation(groupId);
  }

  function handleTabChange(tab: ChatTab) {
    setChatTab(tab);
    if (tab === "live") {
      setMobileView("list");
    }
  }

  function emitTyping(isTyping: boolean) {
    const activeSocket = getSocket();
    if (!activeSocket?.connected) {
      return;
    }

    if (activeUser) {
      const payload = {
        chatType: "direct" as const,
        targetId: activeUser.id,
      };
      activeSocket.emit(isTyping ? "typing_start" : "typing_stop", payload);
      activeSocket.emit("typing", {
        ...payload,
        isTyping,
      });
    }
    if (activeGroup) {
      const payload = {
        chatType: "group" as const,
        targetId: activeGroup.id,
      };
      activeSocket.emit(isTyping ? "typing_start" : "typing_stop", payload);
      activeSocket.emit("typing", {
        ...payload,
        isTyping,
      });
    }
  }

  function emitTypingStop() {
    emitTyping(false);
  }

  function handleInputChange(value: string) {
    setMessageInput(value);
    emitTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  }

  async function handleSendVoiceNote(file: File, durationSeconds: number) {
    if (!activeUser?.id || chatTab !== "direct" || isSending) {
      if (!activeUser?.id) {
        showFeatureNotice("Select a chat first");
      }
      throw new Error("Voice note send unavailable");
    }

    setIsSending(true);

    try {
      const created = await sendVoiceMessage(
        activeUser.id,
        file,
        durationSeconds,
      );

      setMessages((current) => {
        if (current.some((item) => item.id === created.id)) {
          return current;
        }
        return [...current, created];
      });
      setConversations((current) => {
        const updated: Conversation = {
          user: activeUser,
          lastMessage: {
            id: created.id,
            content: getMessagePreview(created),
            createdAt: created.createdAt,
            senderId: created.senderId,
          },
          unreadCount: 0,
        };
        return [
          updated,
          ...current.filter((c) => c.user.id !== activeUser.id),
        ];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Send voice note failed:", err);
      }

      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        throw err;
      }

      showFeatureNotice("Could not send voice note. Please try again.");
      throw err;
    } finally {
      setIsSending(false);
    }
  }

  async function sendViaRest(trimmed: string) {
    if (chatTab === "direct" && activeUser) {
      const marketplaceItemId =
        listingId && !marketplaceInquirySentRef.current
          ? listingId
          : undefined;

      const created = await sendMessage(activeUser.id, trimmed, {
        marketplaceItemId,
      });

      if (marketplaceItemId) {
        marketplaceInquirySentRef.current = true;
      }

      setMessages((current) => {
        if (current.some((item) => item.id === created.id)) {
          return current;
        }
        return [...current, created];
      });
      setConversations((current) => {
        const updated: Conversation = {
          user: activeUser,
          lastMessage: {
            id: created.id,
            content: getMessagePreview(created),
            createdAt: created.createdAt,
            senderId: created.senderId,
          },
          unreadCount: 0,
        };
        return [
          updated,
          ...current.filter((c) => c.user.id !== activeUser.id),
        ];
      });
      return;
    }

    if (chatTab === "group" && activeGroup) {
      const created = await sendGroupMessage(activeGroup.id, trimmed);
      setGroupMessages((current) => {
        if (current.some((item) => item.id === created.id)) {
          return current;
        }
        return [...current, created];
      });
      setGroupChats((current) => {
        const existing = current.find((c) => c.group.id === activeGroup.id);
        if (!existing) {
          return current;
        }
        const updated: GroupChatSummary = {
          ...existing,
          lastMessage: created,
        };
        return [
          updated,
          ...current.filter((c) => c.group.id !== activeGroup.id),
        ];
      });
    }
  }

  async function handleSendMessage() {
    const trimmed = messageInput.trim();

    if (!trimmed || isSending) {
      return;
    }

    if (chatTab === "direct") {
      if (!activeUser?.id) {
        setError("Select a chat first");
        return;
      }
      if (activeUser.id === currentUserId) {
        setError("You cannot message yourself");
        return;
      }
    }

    if (chatTab === "group" && !activeGroup?.id) {
      setError("Select a hub chat first");
      return;
    }

    setIsSending(true);
    setError(null);
    emitTypingStop();

    try {
      await sendViaRest(trimmed);
      setMessageInput("");
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error("Send message failed:", err);

      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      const routeUnavailable =
        err instanceof ApiError &&
        (err.status === 404 || err.message.includes("Cannot POST"));

      setError(
        routeUnavailable
          ? "Message service is updating. Please try again."
          : "Could not send message. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function beginCall(type: CallType, peerId: string, peerName: string) {
    if (!currentUserId) {
      return;
    }

    if (!isWebRTCSupported()) {
      showFeatureNotice("Calls are not supported on this device or browser.");
      return;
    }

    const socket = getSocket();
    if (!socket?.connected) {
      showFeatureNotice("Connect to live chat before starting a call.");
      return;
    }

    if (callSessionRef.current || callStatus) {
      showFeatureNotice("You are already in a call.");
      return;
    }

    setCallType(type);
    setCallStatus("connecting");
    setCallPeerId(peerId);
    setCallPeerName(peerName);
    setCallVideoEnabled(type === "video");

    const session = new CallSession({
      socket,
      localUserId: currentUserId,
      peerId,
      callType: type,
      isInitiator: true,
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onConnected: () => setCallStatus("active"),
      onEnded: resetCallState,
      onError: (message) => {
        showFeatureNotice(message);
        resetCallState();
      },
    });

    callSessionRef.current = session;
    await session.start();
  }

  async function acceptIncomingCall() {
    if (!currentUserId || !incomingCallRef.current || !callPeerId) {
      return;
    }

    const socket = getSocket();
    if (!socket?.connected) {
      showFeatureNotice("Live connection unavailable. Try again.");
      resetCallState();
      return;
    }

    const incoming = incomingCallRef.current;
    setCallStatus("connecting");
    setCallType(incoming.callType);
    setCallVideoEnabled(incoming.callType === "video");

    const session = new CallSession({
      socket,
      localUserId: currentUserId,
      peerId: incoming.fromUserId,
      callType: incoming.callType,
      isInitiator: false,
      pendingOffer: incoming.sdp,
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onConnected: () => setCallStatus("active"),
      onEnded: resetCallState,
      onError: (message) => {
        showFeatureNotice(message);
        resetCallState();
      },
    });

    incomingCallRef.current = null;
    callSessionRef.current = session;
    await session.start();
  }

  function declineIncomingCall() {
    if (callPeerId) {
      getSocket()?.emit("call_reject", {
        peerId: callPeerId,
        targetUserId: callPeerId,
      });
    }
    resetCallState();
  }

  async function startDirectCall(type: CallType) {
    if (chatTab !== "direct" || !activeUser) {
      showFeatureNotice("Select a direct chat to start a call.");
      return;
    }

    await beginCall(type, activeUser.id, activeUser.name);
  }

  function handleToggleCallAudio() {
    const enabled = callSessionRef.current?.toggleAudio();
    if (typeof enabled === "boolean") {
      setCallAudioEnabled(enabled);
    }
  }

  function handleToggleCallVideo() {
    const enabled = callSessionRef.current?.toggleVideo();
    if (typeof enabled === "boolean") {
      setCallVideoEnabled(enabled);
    }
  }

  async function beginGroupCall(type: CallType) {
    if (!currentUserId || !activeGroup) {
      return;
    }

    if (!isWebRTCSupported()) {
      showFeatureNotice("Calls are not supported on this browser.");
      return;
    }

    const socket = getSocket();
    if (!socket?.connected) {
      showFeatureNotice("Live connection lost. Reconnecting...");
      return;
    }

    if (callSessionRef.current || groupCallSessionRef.current) {
      showFeatureNotice("You are already in a call.");
      return;
    }

    setGroupCallType(type);
    setGroupCallStatus("connecting");
    setIsInGroupCall(true);
    setGroupCallVideoEnabled(type === "video");
    setActiveGroupCallLive(true);
    setActiveGroupCallType(type);

    const session = new GroupCallSession({
      socket,
      localUserId: currentUserId,
      roomType: "chat",
      roomId: activeGroup.id,
      callType: type,
      onLocalStream: setGroupLocalStream,
      onRemoteStream: (userId, stream) => {
        setGroupRemoteStreams((current) => ({ ...current, [userId]: stream }));
      },
      onRemoteRemoved: (userId) => {
        setGroupRemoteStreams((current) => {
          const next = { ...current };
          delete next[userId];
          return next;
        });
        setGroupCallParticipants((current) =>
          current.filter((participant) => participant.userId !== userId),
        );
      },
      onParticipants: setGroupCallParticipants,
      onParticipantJoined: (participant) => {
        setGroupCallParticipants((current) => {
          if (current.some((item) => item.userId === participant.userId)) {
            return current;
          }
          return [...current, participant];
        });
      },
      onConnected: () => setGroupCallStatus("active"),
      onEnded: () => {
        resetGroupCallState();
        setActiveGroupCallLive(false);
      },
      onError: (message) => {
        showFeatureNotice(message);
        resetGroupCallState();
        setActiveGroupCallLive(false);
      },
    });

    groupCallSessionRef.current = session;
    await session.join();
  }

  async function joinActiveGroupCall() {
    await beginGroupCall(activeGroupCallType);
  }

  function handleToggleGroupCallAudio() {
    const enabled = groupCallSessionRef.current?.toggleAudio();
    if (typeof enabled === "boolean") {
      setGroupCallAudioEnabled(enabled);
    }
  }

  function handleToggleGroupCallVideo() {
    const enabled = groupCallSessionRef.current?.toggleVideo();
    if (typeof enabled === "boolean") {
      setGroupCallVideoEnabled(enabled);
    }
  }

  function renderCallActions() {
    const isDirectChat = chatTab === "direct" && Boolean(activeUser);
    const isGroupChat = chatTab === "group" && Boolean(activeGroup);
    const canShowCallPlaceholder = isDirectChat || isGroupChat;

    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (canShowCallPlaceholder) {
              showFeatureNotice("Audio/video calls are getting ready.");
            }
          }}
          disabled={!canShowCallPlaceholder}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 disabled:opacity-40 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
          aria-label="Audio call"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (canShowCallPlaceholder) {
              showFeatureNotice("Audio/video calls are getting ready.");
            }
          }}
          disabled={!canShowCallPlaceholder}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 disabled:opacity-40 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
          aria-label="Video call"
        >
          <Video className="h-4 w-4" />
        </button>
        {isDirectChat && activeUser ? (
          <ChatSafetyMenu
            userId={activeUser.id}
            userName={activeUser.name}
            onBlockChange={(status) => {
              setBlockedByMe(status.blockedByMe);
              setChatBlocked(status.isBlocked);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => showFeatureNotice("More options coming soon.")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="linkup-page overflow-x-hidden pb-24 lg:pb-8">
        <div className="linkup-container-wide min-w-0">
          <header className="linkup-panel mb-6 p-5 sm:p-7">
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="mt-3 h-8 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
          </header>
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:gap-6">
            <aside className="linkup-panel p-4 sm:p-5">
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="mt-4 h-10 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="mt-4 h-10 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="mt-4">
                <ChatsListSkeleton />
              </div>
            </aside>
            <main className="linkup-panel hidden lg:block">
              <ChatsThreadSkeleton />
            </main>
          </div>
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conversation.user.name.toLowerCase().includes(q) ||
      conversation.lastMessage.content.toLowerCase().includes(q)
    );
  });

  const filteredGroupChats = groupChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = chat.group.name.toLowerCase();
    const last = chat.lastMessage?.content.toLowerCase() ?? "";
    return name.includes(q) || last.includes(q);
  });

  const showChatPanel =
    chatTab !== "live" &&
    (chatTab === "direct" ? Boolean(activeUser) : Boolean(activeGroup));

  return (
    <div className="linkup-page overflow-x-hidden pb-24 lg:pb-8">
      <div className="linkup-container-wide min-w-0">
        <header className="linkup-panel mb-6 overflow-hidden p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                LinkUp
              </p>
              <h1 className="linkup-title mt-2">Chats</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                Talk, collaborate, and stay live with your network.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-200">
              <span className="relative flex h-2 w-2">
                {!hasAuthToken() ? (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-400" />
                ) : socketStatus === "connected" ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </>
                ) : socketStatus === "reconnecting" ? (
                  <span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-400" />
                )}
              </span>
              {!hasAuthToken()
                ? "Login required"
                : socketStatus === "connected"
                  ? "Live"
                  : socketStatus === "reconnecting"
                    ? "Reconnecting"
                    : "Offline"}
            </div>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mb-4 rounded-3xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
            {notice}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:gap-6">
          {/* Left panel — chat list */}
          <aside
            className={`linkup-panel min-w-0 overflow-hidden p-4 sm:p-5 ${
              mobileView === "chat" ? "hidden lg:flex lg:flex-col" : "flex flex-col"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Chats
              </h2>
              {chatTab === "direct" ? (
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="shrink-0 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15 dark:text-brand-secondary"
                >
                  New Chat
                </button>
              ) : (
                <Link
                  href={chatTab === "group" ? "/groups" : "/events"}
                  className="shrink-0 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15 dark:text-brand-secondary"
                >
                  {chatTab === "group" ? "Browse Groups" : "Happenings"}
                </Link>
              )}
            </div>

            <div className="mt-4 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats..."
                  className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-slate-200/80 bg-slate-50 p-1 dark:border-white/10 dark:bg-brand-dark/80">
              {(
                [
                  { id: "direct", label: "Direct" },
                  { id: "group", label: "Groups" },
                  { id: "live", label: "Live" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-full px-2 py-2 text-xs font-semibold transition sm:px-3 ${
                    chatTab === tab.id
                      ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-sm shadow-brand-primary/25"
                      : "text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-brand-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
              {chatTab === "direct" ? (
                filteredConversations.length === 0 ? (
                  <ChatsEmptyState
                    icon={MessageCircle}
                    title="No chats yet"
                    description="Start a conversation with someone from Discover."
                    actionLabel="Go to Discover"
                    actionHref="/explore"
                  />
                ) : (
                  filteredConversations.map((conversation) => (
                    <ChatListItem
                      key={conversation.user.id}
                      variant="direct"
                      userId={conversation.user.id}
                      name={conversation.user.name}
                      avatarUrl={conversation.user.avatarUrl}
                      lastMessage={conversation.lastMessage.content}
                      time={formatTimeAgo(conversation.lastMessage.createdAt)}
                      unread={conversation.unreadCount}
                      online={isUserOnline(conversation.user.id)}
                      active={activeUser?.id === conversation.user.id}
                      onClick={() =>
                        void handleSelectConversation(conversation.user.id)
                      }
                    />
                  ))
                )
              ) : chatTab === "group" ? (
                filteredGroupChats.length === 0 ? (
                  <ChatsEmptyState
                    icon={Users}
                    title="No group chats yet"
                    description="Join a Hub to start group conversations."
                    actionLabel="Explore Hubs"
                    actionHref="/groups"
                  />
                ) : (
                  filteredGroupChats.map((chat) => (
                    <ChatListItem
                      key={chat.group.id}
                      variant="group"
                      name={chat.group.name}
                      avatarUrl={chat.group.coverImage}
                      lastMessage={
                        chat.lastMessage?.content ?? "No messages yet"
                      }
                      time={
                        chat.lastMessage
                          ? formatTimeAgo(chat.lastMessage.createdAt)
                          : ""
                      }
                      memberCount={chat.membersCount}
                      unread={0}
                      active={activeGroup?.id === chat.group.id}
                      onClick={() => void handleSelectGroup(chat.group.id)}
                    />
                  ))
                )
              ) : (
                <>
                  <ChatsEmptyState
                    icon={Radio}
                    title="No live rooms active right now"
                    description="Live rooms will appear here when your hubs or happenings go live."
                    actionLabel="Explore Hubs"
                    actionHref="/groups"
                  />
                  {LIVE_PLACEHOLDER_ROOMS.map((room) => (
                    <LiveRoomCard
                      key={room.title}
                      title={room.title}
                      subtitle={room.subtitle}
                      onClick={() =>
                        showFeatureNotice(
                          "Live rooms will appear here when your hubs or happenings go live.",
                        )
                      }
                    />
                  ))}
                </>
              )}
            </div>
          </aside>

          {/* Right panel — active chat */}
          <main
            className={`linkup-panel relative min-w-0 p-0 sm:p-0 ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            {showChatPanel ? (
              <div className="flex min-h-[min(100dvh-12rem,760px)] flex-col md:h-[min(72vh,760px)]">
                {/* Chat header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 lg:hidden dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                      aria-label="Back to chats"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    {chatTab === "direct" && activeUser ? (
                      <>
                        <UserAvatar
                          src={activeUser.avatarUrl}
                          name={activeUser.name}
                          username={activeUser.username}
                          size="md"
                          shape="rounded"
                          className="h-11 w-11"
                          ringClassName={`ring-2 ${getChatRingClass(activeUser.id)}`}
                        />
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                            {activeUser.name}
                          </h2>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <OnlineStatusBadge
                              userId={activeUser.id}
                              showLabel
                              size="sm"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              · Direct chat
                            </span>
                          </div>
                        </div>
                      </>
                    ) : activeGroup ? (
                      <>
                        <div
                          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${getChatInitialsClass(activeGroup.id)}`}
                        >
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                            {activeGroup.name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Group chat
                            {activeGroupMemberCount > 0
                              ? ` · ${activeGroupMemberCount} member${activeGroupMemberCount === 1 ? "" : "s"}`
                              : ""}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {renderCallActions()}
                  </div>
                </div>

                {chatTab === "group" &&
                activeGroup &&
                activeGroupCallLive &&
                !isInGroupCall ? (
                  <div className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 sm:mx-5">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        Live group call in progress
                      </p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80">
                        {activeGroupCallType === "video"
                          ? "Video call active"
                          : "Audio call active"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void joinActiveGroupCall()}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Join Call
                    </button>
                  </div>
                ) : null}

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                  {chatTab === "direct" ? (
                    messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="rounded-3xl border border-dashed border-slate-300/80 bg-white/80 px-6 py-5 text-center text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/60 dark:text-slate-400">
                          No messages yet. Say hello.
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          text={message.content}
                          type={message.type}
                          mediaUrl={message.mediaUrl}
                          audioUrl={message.audioUrl}
                          duration={message.duration}
                          time={formatMessageTime(message.createdAt)}
                          fromMe={message.senderId === currentUserId}
                          read={message.read}
                          senderId={message.senderId}
                          onReply={handleReplyToMessage}
                          onCopied={handleMessageCopied}
                        />
                      ))
                    )
                  ) : groupMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="rounded-3xl border border-dashed border-slate-300/80 bg-white/80 px-6 py-5 text-center text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/60 dark:text-slate-400">
                        No messages yet. Say hello.
                      </p>
                    </div>
                  ) : (
                    groupMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        text={message.content}
                        time={formatMessageTime(message.createdAt)}
                        fromMe={message.senderId === currentUserId}
                        senderId={message.senderId}
                        senderName={
                          message.senderId === currentUserId
                            ? undefined
                            : message.sender.name
                        }
                        onReply={handleReplyToMessage}
                        onCopied={handleMessageCopied}
                      />
                    ))
                  )}

                  {typingPeerId && chatTab === "direct" ? (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400">
                      Typing…
                    </p>
                  ) : null}
                  {typingGroupId && chatTab === "group" ? (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400">
                      Someone is typing…
                    </p>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-slate-50/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm dark:border-white/10 dark:bg-brand-dark/95 sm:px-4 sm:py-4 md:pb-4">
                  {chatBlocked ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark dark:text-slate-300">
                      {blockedByMe
                        ? "You blocked this user."
                        : "You can't message this user."}
                    </p>
                  ) : (
                  <div className="relative flex min-w-0 items-end gap-1.5 rounded-3xl border border-slate-200/80 bg-white px-2 py-2 shadow-sm dark:border-white/10 dark:bg-brand-dark sm:gap-2 sm:px-3 sm:py-2.5">
                    <button
                      type="button"
                      onClick={() => setShowEmoji((current) => !current)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition duration-150 hover:scale-105 hover:bg-slate-100 active:scale-95 hover:text-brand-primary dark:hover:bg-white/10 dark:hover:text-brand-secondary"
                      aria-label="Add emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmoji ? (
                      <EmojiPicker
                        onSelect={(emoji) => {
                          setMessageInput((current) => `${current}${emoji}`);
                          setShowEmoji(false);
                        }}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        showFeatureNotice("Attachments are coming soon.")
                      }
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition duration-150 hover:scale-105 hover:bg-slate-100 active:scale-95 hover:text-brand-primary dark:hover:bg-white/10 dark:hover:text-brand-secondary"
                      aria-label="Attach file"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    {chatTab === "direct" &&
                    activeUser &&
                    isVoiceRecordingSupported() ? (
                      <VoiceNoteRecorder
                        variant="icon"
                        disabled={!activeUser}
                        isSending={isSending}
                        onSend={handleSendVoiceNote}
                        onNotice={showFeatureNotice}
                        onRecordingChange={setIsVoiceRecording}
                      />
                    ) : null}
                    <textarea
                      value={messageInput}
                      onChange={(event) =>
                        handleInputChange(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      rows={1}
                      className="max-h-32 min-h-[2.25rem] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm"
                      placeholder="Type your message..."
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={
                        !messageInput.trim() || isSending || isVoiceRecording
                      }
                      className="linkup-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {isSending ? "Sending…" : "Send"}
                      </span>
                    </button>
                  </div>
                  )}
                </div>
              </div>
            ) : chatTab === "live" ? (
              <div className="flex min-h-[min(100dvh-12rem,760px)] flex-col items-center justify-center px-6 py-10 md:h-[min(72vh,760px)]">
                <ChatsEmptyState
                  icon={Radio}
                  title="No live rooms active right now"
                  description="Live rooms will appear here when your hubs or happenings go live."
                  actionLabel="Explore Hubs"
                  actionHref="/groups"
                />
              </div>
            ) : (
              <div className="flex min-h-[min(100dvh-12rem,760px)] items-center justify-center px-6 py-10 md:h-[min(72vh,760px)]">
                <div className="max-w-sm rounded-3xl border border-dashed border-slate-300/80 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-brand-dark/60">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                    Select a chat
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Select a chat to start the conversation.
                  </p>
                  <Link
                    href="/explore"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20"
                  >
                    Start Chat
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {callType && callStatus ? (
        <CallOverlay
          callType={callType}
          peerName={callPeerName}
          localStream={localStream}
          remoteStream={remoteStream}
          status={callStatus}
          audioEnabled={callAudioEnabled}
          videoEnabled={callVideoEnabled}
          onAccept={() => void acceptIncomingCall()}
          onDecline={declineIncomingCall}
          onEnd={endCall}
          onToggleAudio={handleToggleCallAudio}
          onToggleVideo={handleToggleCallVideo}
        />
      ) : null}

      {groupCallType && groupCallStatus && activeGroup && currentUserId ? (
        <GroupCallOverlay
          callType={groupCallType}
          roomLabel={activeGroup.name}
          localUserId={currentUserId}
          localName={currentUser?.name ?? "You"}
          localStream={groupLocalStream}
          participants={groupCallParticipants}
          remoteStreams={groupRemoteStreams}
          status={groupCallStatus}
          audioEnabled={groupCallAudioEnabled}
          videoEnabled={groupCallVideoEnabled}
          socketConnected={socketStatus === "connected"}
          onLeave={leaveGroupCall}
          onToggleAudio={handleToggleGroupCallAudio}
          onToggleVideo={handleToggleGroupCallVideo}
        />
      ) : null}

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />

      {process.env.NODE_ENV === "development" ? (
        <div className="fixed bottom-2 right-2 z-50 max-w-xs rounded-lg border border-slate-300/40 bg-white/90 p-2 text-[10px] leading-relaxed text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
          <p>socket connected: {String(Boolean(socket?.connected))}</p>
          <p>socket id: {socket?.id ?? "—"}</p>
          <p>token exists: {String(Boolean(getToken()))}</p>
          <p>current user id: {currentUserId ?? "—"}</p>
          <p>selectedUserId: {activeUser?.id ?? selectedUserId ?? "—"}</p>
          <p>joined room: {joinedDirectRoom ?? "—"}</p>
        </div>
      ) : null}
    </div>
  );
}
