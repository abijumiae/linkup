"use client";

import { useEffect, useRef } from "react";
import { LiveTalkMessage } from "@/src/lib/groupLiveTalk";

type LiveTalkMessagesProps = {
  messages: LiveTalkMessage[];
  localUserId: string;
};

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function LiveTalkMessages({
  messages,
  localUserId,
}: LiveTalkMessagesProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const isNewMessage = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;

    const scrollToBottom = () => {
      list.scrollTop = list.scrollHeight;
    };

    if (isNewMessage) {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ul
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4"
      >
        {messages.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No messages yet. Say hello to the room.
          </li>
        ) : (
          messages.map((msg) => {
            if (msg.kind === "system") {
              return (
                <li key={msg.id} className="flex justify-center">
                  <span className="max-w-[95%] break-words rounded-full bg-slate-100/90 px-3 py-1 text-center text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400">
                    {msg.content}
                  </span>
                </li>
              );
            }

            const isSelf = msg.userId === localUserId;
            const name = isSelf ? "You" : (msg.user?.name ?? "Member");

            return (
              <li
                key={msg.id}
                className={`flex gap-2 ${isSelf ? "flex-row-reverse" : ""}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-[10px] font-bold text-white">
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div
                  className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${
                    isSelf ? "text-right" : ""
                  }`}
                >
                  <p className="mb-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {name}{" "}
                    <span className="font-normal opacity-70">
                      {formatTime(msg.createdAt)}
                    </span>
                  </p>
                  <p
                    className={`inline-block max-w-full break-words rounded-2xl px-3 py-2 text-sm leading-snug ${
                      isSelf
                        ? "rounded-br-md bg-gradient-to-r from-brand-primary to-brand-secondary text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100"
                    }`}
                  >
                    {msg.content}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
