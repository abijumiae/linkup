"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Search,
  Send,
  Smile,
  Users,
  Video,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  ChatSocketMessage,
  disconnectChatSocket,
  getChatSocket,
} from "@/src/lib/chatSocket";
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
  sendMessage,
} from "@/src/lib/messages";
import { formatTimeAgo } from "@/src/lib/posts";
import { CallSession, CallType } from "@/src/lib/webrtc";
import AuthLoadingScreen from "../../components/AuthLoadingScreen";
import CallOverlay from "../../components/CallOverlay";
import ChatListItem from "../../components/ChatListItem";
import EmojiPicker from "../../components/EmojiPicker";
import MessageBubble from "../../components/MessageBubble";

type ChatTab = "direct" | "group";

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingPeerId, setTypingPeerId] = useState<string | null>(null);
  const [typingGroupId, setTypingGroupId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "active" | "incoming" | null
  >(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callSessionRef = useRef<CallSession | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
      setError("Unable to load chats. Please try again.");
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
      setError(null);
      setChatTab("direct");

      try {
        const data = await fetchConversation(userId);
        setActiveUser(data.user);
        setActiveGroup(null);
        setMessages(data.messages);
        setGroupMessages([]);
        setMobileView("chat");
        setConversations((current) =>
          current.map((conversation) =>
            conversation.user.id === userId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
        getChatSocket()?.emit("join:dm", { peerId: userId });
        setTimeout(scrollToBottom, 50);
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
    [router, scrollToBottom],
  );

  const openGroupConversation = useCallback(
    async (groupId: string) => {
      setError(null);
      setChatTab("group");

      try {
        const data = await fetchGroupConversation(groupId);
        setActiveGroup(data.group);
        setActiveUser(null);
        setGroupMessages(data.messages);
        setMessages([]);
        setMobileView("chat");
        getChatSocket()?.emit("join:group", { groupId });
        setTimeout(scrollToBottom, 50);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load hub chat. Please try again.",
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
      } else {
        const targetId = selectedUserId ?? list[0]?.user.id ?? null;
        if (targetId) {
          await openConversation(targetId);
        } else if (groups[0]?.group.id) {
          setChatTab("group");
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [
    selectedUserId,
    selectedGroupId,
    loadConversations,
    loadGroupChats,
    openConversation,
    openGroupConversation,
  ]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !currentUserId) {
      return;
    }

    const onMessage = (payload: ChatSocketMessage) => {
      if (payload.type === "direct") {
        const message = payload.message;
        const peerId =
          message.senderId === currentUserId
            ? message.receiverId
            : message.senderId;

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
              content: message.content,
              createdAt:
                typeof message.createdAt === "string"
                  ? message.createdAt
                  : new Date(message.createdAt).toISOString(),
              senderId: message.senderId,
            },
            unreadCount:
              activeUser?.id === peerId || message.senderId === currentUserId
                ? 0
                : (existing?.unreadCount ?? 0) + 1,
          };

          return [
            updated,
            ...current.filter((c) => c.user.id !== peerId),
          ];
        });

        if (activeUser?.id === peerId) {
          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
              return current;
            }
            return [
              ...current,
              {
                ...message,
                createdAt:
                  typeof message.createdAt === "string"
                    ? message.createdAt
                    : new Date(message.createdAt).toISOString(),
                updatedAt:
                  typeof message.updatedAt === "string"
                    ? message.updatedAt
                    : new Date(message.updatedAt).toISOString(),
              },
            ];
          });
        }
        return;
      }

      const message = payload.message;
      setGroupChats((current) => {
        const existing = current.find((c) => c.group.id === message.groupId);
        if (!existing) {
          void loadGroupChats();
          return current;
        }

        const updated: GroupChatSummary = {
          ...existing,
          lastMessage: {
            ...message,
            createdAt:
              typeof message.createdAt === "string"
                ? message.createdAt
                : new Date(message.createdAt).toISOString(),
            updatedAt:
              typeof message.updatedAt === "string"
                ? message.updatedAt
                : new Date(message.updatedAt).toISOString(),
          },
        };

        return [
          updated,
          ...current.filter((c) => c.group.id !== message.groupId),
        ];
      });

      if (activeGroup?.id === message.groupId) {
        setGroupMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [
            ...current,
            {
              ...message,
              createdAt:
                typeof message.createdAt === "string"
                  ? message.createdAt
                  : new Date(message.createdAt).toISOString(),
              updatedAt:
                typeof message.updatedAt === "string"
                  ? message.updatedAt
                  : new Date(message.updatedAt).toISOString(),
            },
          ];
        });
      }
    };

    const onRead = (payload: { readerId: string; peerId: string }) => {
      if (activeUser?.id !== payload.peerId) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.senderId === currentUserId ? { ...message, read: true } : message,
        ),
      );
    };

    const onTypingStart = (payload: {
      userId: string;
      peerId?: string;
      groupId?: string;
    }) => {
      if (payload.userId === currentUserId) {
        return;
      }
      if (payload.groupId && activeGroup?.id === payload.groupId) {
        setTypingGroupId(payload.userId);
      }
      if (payload.peerId && activeUser?.id === payload.userId) {
        setTypingPeerId(payload.userId);
      }
    };

    const onTypingStop = (payload: {
      userId: string;
      peerId?: string;
      groupId?: string;
    }) => {
      if (payload.groupId && activeGroup?.id === payload.groupId) {
        setTypingGroupId(null);
      }
      if (payload.peerId && activeUser?.id === payload.userId) {
        setTypingPeerId(null);
      }
    };

    const onPresence = (payload: {
      userId: string;
      online: boolean;
    }) => {
      setOnlineUsers((current) => ({
        ...current,
        [payload.userId]: payload.online,
      }));
    };

    const onCallOffer = (payload: {
      fromUserId: string;
      callType?: CallType;
    }) => {
      if (chatTab !== "direct" || activeUser?.id !== payload.fromUserId) {
        return;
      }
      setCallType(payload.callType ?? "video");
      setCallStatus("incoming");
    };

    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("presence:update", onPresence);
    socket.on("call:offer", onCallOffer);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("message:read", onRead);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("presence:update", onPresence);
      socket.off("call:offer", onCallOffer);
    };
  }, [
    activeGroup?.id,
    activeUser?.id,
    chatTab,
    currentUserId,
    loadConversations,
    loadGroupChats,
  ]);

  useEffect(() => {
    return () => {
      callSessionRef.current?.end();
      disconnectChatSocket();
    };
  }, []);

  useEffect(() => {
    marketplaceInquirySentRef.current = false;
  }, [selectedUserId, listingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, groupMessages, scrollToBottom]);

  async function handleSelectConversation(userId: string) {
    router.replace(`/messages?userId=${userId}`);
    await openConversation(userId);
  }

  async function handleSelectGroup(groupId: string) {
    router.replace(`/messages?groupId=${groupId}`);
    await openGroupConversation(groupId);
  }

  function emitTypingStop() {
    const socket = getChatSocket();
    if (!socket) {
      return;
    }
    if (activeUser) {
      socket.emit("typing:stop", { peerId: activeUser.id });
    }
    if (activeGroup) {
      socket.emit("typing:stop", { groupId: activeGroup.id });
    }
  }

  function handleInputChange(value: string) {
    setMessageInput(value);
    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    if (activeUser) {
      socket.emit("typing:start", { peerId: activeUser.id });
    }
    if (activeGroup) {
      socket.emit("typing:start", { groupId: activeGroup.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  }

  async function handleSendMessage() {
    const trimmed = messageInput.trim();

    if (!trimmed || isSending) {
      return;
    }

    if (chatTab === "direct" && !activeUser) {
      return;
    }
    if (chatTab === "group" && !activeGroup) {
      return;
    }

    setIsSending(true);
    setError(null);
    setNotice(null);
    emitTypingStop();

    try {
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
        setMessageInput("");
        setMessages((current) => [...current, created]);
        setConversations((current) => {
          const updated: Conversation = {
            user: activeUser,
            lastMessage: {
              id: created.id,
              content: created.content,
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
      } else if (chatTab === "group" && activeGroup) {
        const created = await sendGroupMessage(activeGroup.id, trimmed);
        setMessageInput("");
        setGroupMessages((current) => [...current, created]);
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
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function startCall(type: CallType) {
    if (!activeUser || !currentUserId) {
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      setError("Live connection unavailable. Refresh and try again.");
      return;
    }

    setCallType(type);
    setCallStatus("connecting");

    const session = new CallSession({
      socket,
      localUserId: currentUserId,
      peerId: activeUser.id,
      callType: type,
      isInitiator: true,
      onLocalStream: setLocalStream,
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setCallStatus("active");
      },
      onEnded: endCall,
      onError: (message) => setError(message),
    });

    callSessionRef.current = session;
    await session.start();
  }

  async function acceptCall() {
    if (!activeUser || !currentUserId || !callType) {
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    setCallStatus("connecting");

    const session = new CallSession({
      socket,
      localUserId: currentUserId,
      peerId: activeUser.id,
      callType,
      isInitiator: false,
      onLocalStream: setLocalStream,
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setCallStatus("active");
      },
      onEnded: endCall,
      onError: (message) => setError(message),
    });

    callSessionRef.current = session;
    await session.start();
  }

  function endCall() {
    callSessionRef.current?.end();
    callSessionRef.current = null;
    setCallType(null);
    setCallStatus(null);
    setLocalStream(null);
    setRemoteStream(null);
  }

  if (isLoading) {
    return <AuthLoadingScreen message="Loading chats..." />;
  }

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = conversation.user.name.toLowerCase();
    const last = conversation.lastMessage.content.toLowerCase();
    return name.includes(q) || last.includes(q);
  });

  const filteredGroupChats = groupChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = chat.group.name.toLowerCase();
    const last = chat.lastMessage?.content.toLowerCase() ?? "";
    return name.includes(q) || last.includes(q);
  });

  const activeMessages =
    chatTab === "group"
      ? groupMessages
      : messages;

  const showChatPanel =
    chatTab === "direct" ? Boolean(activeUser) : Boolean(activeGroup);

  return (
    <div className="linkup-page pb-24 lg:pb-8">
      <div className="linkup-container-wide">
        <header className="mb-6 linkup-panel p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
              LinkUp Chats
            </p>
            <h1 className="linkup-title mt-2">Chats</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Real-time messages, hub chats, and live calls.
            </p>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            {notice}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <aside
            className={`linkup-panel min-w-0 p-4 sm:p-5 ${
              mobileView === "chat" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-brand-dark/80">
              <button
                type="button"
                onClick={() => setChatTab("direct")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  chatTab === "direct"
                    ? "bg-brand-primary text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setChatTab("group")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  chatTab === "group"
                    ? "bg-brand-primary text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Hubs
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-primary dark:text-brand-secondary">
                  {chatTab === "direct" ? "Direct" : "Hub chats"}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {chatTab === "direct"
                    ? "Pick a chat to continue the flow."
                    : "Chat with your hub members."}
                </p>
              </div>
              <Link
                href={chatTab === "direct" ? "/explore" : "/hubs"}
                className="shrink-0 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15 dark:text-brand-secondary"
              >
                {chatTab === "direct" ? "New Chat" : "Browse Hubs"}
              </Link>
            </div>

            <div className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {chatTab === "direct" ? (
                filteredConversations.length === 0 ? (
                  <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/85 dark:text-slate-400">
                    No chats yet. Start a new connection from Discover.
                  </p>
                ) : (
                  filteredConversations.map((conversation) => (
                    <ChatListItem
                      key={conversation.user.id}
                      name={conversation.user.name}
                      avatarUrl={conversation.user.avatarUrl}
                      lastMessage={conversation.lastMessage.content}
                      time={formatTimeAgo(conversation.lastMessage.createdAt)}
                      unread={conversation.unreadCount}
                      active={activeUser?.id === conversation.user.id}
                      onClick={() =>
                        void handleSelectConversation(conversation.user.id)
                      }
                    />
                  ))
                )
              ) : filteredGroupChats.length === 0 ? (
                <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/85 dark:text-slate-400">
                  No hub chats yet. Join a hub to start chatting.
                </p>
              ) : (
                filteredGroupChats.map((chat) => (
                  <ChatListItem
                    key={chat.group.id}
                    name={chat.group.name}
                    avatarUrl={chat.group.coverImage}
                    lastMessage={chat.lastMessage?.content ?? "No messages yet"}
                    time={
                      chat.lastMessage
                        ? formatTimeAgo(chat.lastMessage.createdAt)
                        : ""
                    }
                    unread={0}
                    active={activeGroup?.id === chat.group.id}
                    onClick={() => void handleSelectGroup(chat.group.id)}
                  />
                ))
              )}
            </div>
          </aside>

          <main
            className={`linkup-panel relative min-w-0 p-4 sm:p-5 ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            {showChatPanel ? (
              <div className="flex h-[min(68vh,720px)] flex-col gap-4 sm:h-[min(74vh,720px)] sm:gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-slate-50 p-4 dark:bg-brand-dark/85">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
                      aria-label="Back to chats"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    {chatTab === "direct" && activeUser ? (
                      <>
                        {activeUser.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeUser.avatarUrl}
                            alt=""
                            className="h-12 w-12 rounded-3xl object-cover ring-2 ring-brand-primary/20"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary text-lg font-semibold text-white">
                            {activeUser.name
                              .trim()
                              .split(/\s+/)
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
                            Direct chat
                          </p>
                          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {activeUser.name}
                          </h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            @{activeUser.username}
                          </p>
                        </div>
                      </>
                    ) : activeGroup ? (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
                            Hub chat
                          </p>
                          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {activeGroup.name}
                          </h2>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {chatTab === "direct" && activeUser ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void startCall("audio")}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                          aria-label="Audio call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void startCall("video")}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                          aria-label="Video call"
                        >
                          <Video className="h-4 w-4" />
                        </button>
                        <div
                          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                            onlineUsers[activeUser.id]
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              onlineUsers[activeUser.id]
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {onlineUsers[activeUser.id] ? "Online" : "Offline"}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {activeMessages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-white/15 dark:bg-brand-dark/60">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  ) : chatTab === "direct" ? (
                    messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        text={message.content}
                        time={formatMessageTime(message.createdAt)}
                        fromMe={message.senderId === currentUserId}
                        read={message.read}
                      />
                    ))
                  ) : (
                    groupMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        text={message.content}
                        time={formatMessageTime(message.createdAt)}
                        fromMe={message.senderId === currentUserId}
                        senderName={
                          message.senderId === currentUserId
                            ? undefined
                            : message.sender.name
                        }
                      />
                    ))
                  )}
                  {typingPeerId && chatTab === "direct" ? (
                    <p className="text-xs text-slate-500">Typing...</p>
                  ) : null}
                  {typingGroupId && chatTab === "group" ? (
                    <p className="text-xs text-slate-500">Someone is typing...</p>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>

                <div className="sticky bottom-0 z-10 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-brand-dark/80 sm:p-4">
                  <div className="relative flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-brand-dark/90 sm:gap-3 sm:px-4 sm:py-3">
                    <button
                      type="button"
                      onClick={() => setShowEmoji((current) => !current)}
                      className="shrink-0 text-slate-500 hover:text-brand-primary dark:hover:text-brand-secondary"
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
                    <input
                      value={messageInput}
                      onChange={(event) => handleInputChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm"
                      placeholder="Type a message..."
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!messageInput.trim() || isSending}
                      className="linkup-btn-primary shrink-0 px-3 py-2.5 text-xs sm:px-4 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[min(74vh,720px)] items-center justify-center p-6">
                <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-brand-dark/60">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                    No chat selected
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Pick a chat or start a new connection.
                  </p>
                  <Link
                    href="/explore"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
                  >
                    Start Chat
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {callType && callStatus && activeUser ? (
        <CallOverlay
          callType={callType}
          peerName={activeUser.name}
          localStream={localStream}
          remoteStream={remoteStream}
          status={callStatus}
          onAccept={() => void acceptCall()}
          onDecline={endCall}
          onEnd={endCall}
        />
      ) : null}
    </div>
  );
}
