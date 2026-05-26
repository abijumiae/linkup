"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
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
  const currentUserId = getCurrentUser()?.id ?? null;
  const marketplaceInquirySentRef = useRef(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUser, setActiveUser] = useState<Conversation["user"] | null>(
    null,
  );
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError("Unable to load conversations. Please try again.");
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
            : "Unable to load conversation. Please try again.",
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

  async function handleSendMessage() {
    const trimmed = messageInput.trim();

    if (!trimmed || !activeUser || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

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
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to send message. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return <AuthLoadingScreen message="Loading messages..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error}</p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                  Messages
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Chats</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {conversations.length === 0 ? (
                <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-400">
                  No conversations yet. Message someone from your feed.
                </p>
              ) : (
                conversations.map((conversation) => (
                  <ChatListItem
                    key={conversation.user.id}
                    name={conversation.user.name}
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

          <main className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
            {activeUser ? (
              <div className="flex h-[min(70vh,720px)] flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-slate-50 p-4 dark:bg-slate-950/85">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-lg font-semibold text-violet-600 dark:text-violet-300">
                      {activeUser.name[0]}
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                        Chat
                      </p>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {activeUser.name}
                      </h2>
                      <p className="text-sm text-slate-500">
                        @{activeUser.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">
                      No messages yet. Say hello!
                    </p>
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

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/80">
                  <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900/90">
                    <input
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      placeholder="Write a message..."
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!messageInput.trim() || isSending}
                      className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[min(70vh,720px)] items-center justify-center">
                <p className="text-sm text-slate-400">
                  Select a conversation or start a new chat from the feed.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
