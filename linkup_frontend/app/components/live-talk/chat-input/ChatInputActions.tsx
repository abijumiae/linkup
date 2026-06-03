"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Smile, Sparkles, Sticker } from "lucide-react";
import ChatInputIconButton from "./ChatInputIconButton";
import EmojiPickerPopover from "./EmojiPickerPopover";
import QuickReactionPopover from "./QuickReactionPopover";
import StickerPickerPopover from "./StickerPickerPopover";

export type ChatInputPanel = "emoji" | "sticker" | "reaction" | "attach" | null;

type ChatInputActionsProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSendQuickReaction: (emoji: string) => void;
  disabled?: boolean;
};

function insertAtCursor(
  current: string,
  insert: string,
  input: HTMLInputElement | null,
): { value: string; cursor: number } {
  if (!input || input.selectionStart == null) {
    const next = `${current}${insert}`;
    return { value: next, cursor: next.length };
  }
  const start = input.selectionStart;
  const end = input.selectionEnd ?? start;
  const value = current.slice(0, start) + insert + current.slice(end);
  const cursor = start + insert.length;
  return { value, cursor };
}

export default function ChatInputActions({
  draft,
  onDraftChange,
  inputRef,
  onSendQuickReaction,
  disabled = false,
}: ChatInputActionsProps) {
  const [openPanel, setOpenPanel] = useState<ChatInputPanel>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const closePanel = useCallback(() => setOpenPanel(null), []);

  const insertText = useCallback(
    (text: string) => {
      const { value, cursor } = insertAtCursor(draft, text, inputRef.current);
      onDraftChange(value);
      closePanel();
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(cursor, cursor);
        }
      });
    },
    [closePanel, draft, inputRef, onDraftChange],
  );

  const togglePanel = useCallback(
    (panel: Exclude<ChatInputPanel, null>) => {
      setOpenPanel((prev) => (prev === panel ? null : panel));
    },
    [],
  );

  useEffect(() => {
    if (!openPanel) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [closePanel, openPanel]);

  return (
    <div
      ref={rootRef}
      className="relative flex max-w-[46%] shrink-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain sm:max-w-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {openPanel === "emoji" ? (
        <EmojiPickerPopover onPick={insertText} />
      ) : null}
      {openPanel === "sticker" ? (
        <StickerPickerPopover onPick={insertText} />
      ) : null}
      {openPanel === "reaction" ? (
        <QuickReactionPopover
          onReact={(emoji) => {
            closePanel();
            onSendQuickReaction(emoji);
          }}
        />
      ) : null}
      {openPanel === "attach" ? (
        <div
          role="dialog"
          aria-label="Attachments"
          className="linkup-lt-popover-enter absolute bottom-full left-0 z-50 mb-2 max-w-[14rem] rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-xs text-slate-600 shadow-xl dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-300"
        >
          <p className="font-medium text-slate-800 dark:text-slate-100">
            Room chat
          </p>
          <p className="mt-1 leading-snug">
            Text and emoji only for now — keeps the room fast and clear.
          </p>
        </div>
      ) : null}

      <ChatInputIconButton
        icon={Smile}
        label="Open emoji picker"
        active={openPanel === "emoji"}
        highlight={openPanel === "emoji"}
        disabled={disabled}
        onClick={() => togglePanel("emoji")}
      />
      <ChatInputIconButton
        icon={Sticker}
        label="Open GIF and stickers"
        active={openPanel === "sticker"}
        disabled={disabled}
        onClick={() => togglePanel("sticker")}
      />
      <ChatInputIconButton
        icon={Sparkles}
        label="Quick reactions"
        active={openPanel === "reaction"}
        disabled={disabled}
        onClick={() => togglePanel("reaction")}
      />
      <ChatInputIconButton
        icon={Paperclip}
        label="Attachment info"
        active={openPanel === "attach"}
        disabled={disabled}
        onClick={() => togglePanel("attach")}
      />
    </div>
  );
}
