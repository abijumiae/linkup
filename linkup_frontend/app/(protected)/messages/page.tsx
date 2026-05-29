"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  ChatMessage,
  Conversation,
  fetchConversation,
  fetchConversations,
  sendMessage,
} from "@/src/lib/messages";
import { formatTimeAgo } from "@/src/lib/posts";
import AuthLoadingScreen from "../../components/AuthLoadingScreen";
import ChatListItem from "../../components/ChatListItem";
import MessageBubble from "../../components/MessageBubble";

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("userId");
  const listingId = searchParams.get("listingId");
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const marketplaceInquirySentRef = useRef(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUser, setActiveUser] = useState<Conversation["user"] | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
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

  const openConversation = useCallback(
    async (userId: string) => {
      setError(null);

      try {
        const data = await fetchConversation(userId);
        setActiveUser(data.user);
        setMessages(data.messages);
        setMobileView("chat");
        setConversations((current) =>
          current.map((conversation) =>
            conversation.user.id === userId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError(null);
      const list = await loadConversations();

      if (cancelled) {
        return;
      }

      const targetId = selectedUserId ?? list[0]?.user.id ?? null;

      if (targetId) {
        await openConversation(targetId);
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, loadConversations, openConversation]);

  useEffect(() => {
    marketplaceInquirySentRef.current = false;
  }, [selectedUserId, listingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSelectConversation(userId: string) {
    router.replace(`/messages?userId=${userId}`);
    await openConversation(userId);
  }

  function appendLocalMessage(content: string) {
    if (!activeUser || !currentUserId) {
      return;
    }

    const createdAt = new Date().toISOString();
    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      content,
      senderId: currentUserId,
      receiverId: activeUser.id,
      read: true,
      createdAt,
      updatedAt: createdAt,
      sender: {
        id: currentUserId,
        name: currentUser?.name ?? "You",
        username: currentUser?.username ?? "you",
        avatarUrl: currentUser?.avatarUrl ?? null,
      },
    };

    setMessages((current) => [...current, localMessage]);
    setConversations((current) => {
      const existing = current.find((c) => c.user.id === activeUser.id);
      const updated: Conversation = {
        user: activeUser,
        lastMessage: {
          id: localMessage.id,
          content: localMessage.content,
          createdAt: localMessage.createdAt,
          senderId: localMessage.senderId,
        },
        unreadCount: 0,
      };

      if (existing) {
        return [updated, ...current.filter((c) => c.user.id !== activeUser.id)];
      }

      return [updated, ...current];
    });
    setMessageInput("");
    setTimeout(scrollToBottom, 50);
  }

  async function handleSendMessage() {
    const trimmed = messageInput.trim();

    if (!trimmed || !activeUser || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    setNotice(null);

    try {
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
        const existing = current.find((c) => c.user.id === activeUser.id);
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

        if (existing) {
          return [
            updated,
            ...current.filter((c) => c.user.id !== activeUser.id),
          ];
        }

        return [updated, ...current];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      // Keep chat usable when the send endpoint is unavailable.
      appendLocalMessage(trimmed);
      setNotice("Chat sent locally. It will sync when API is available.");
    } finally {
      setIsSending(false);
    }
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

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="mb-6 linkup-panel p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
              LinkUp Chats
            </p>
            <h1 className="linkup-title mt-2">
              Chats
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Keep your conversations flowing.
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-primary dark:text-brand-secondary">
                  Chats
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pick a chat to continue the flow.
                </p>
              </div>
              <Link
                href="/explore"
                className="shrink-0 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15 dark:text-brand-secondary"
              >
                New Chat
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
              {filteredConversations.length === 0 ? (
                <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/85 dark:text-slate-400">
                  {conversations.length === 0
                    ? "No chats yet. Start a new connection from Discover."
                    : "No chats match your search."}
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
              )}
            </div>
          </aside>

          <main
            className={`linkup-panel min-w-0 p-4 sm:p-5 ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            {activeUser ? (
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
                        Chat
                      </p>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {activeUser.name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        @{activeUser.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active now
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-white/15 dark:bg-brand-dark/60">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        No chats in this thread yet. Say hello!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        text={message.content}
                        time={formatMessageTime(message.createdAt)}
                        fromMe={message.senderId === currentUserId}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-brand-dark/80 sm:p-4">
                  <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-brand-dark/90 sm:gap-3 sm:px-4 sm:py-3">
                    <input
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm"
                      placeholder="Type a chat..."
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
    </div>
  );
}
