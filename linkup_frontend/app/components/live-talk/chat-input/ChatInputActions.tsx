"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Paperclip, Smile, Sparkles, Sticker } from "lucide-react";
import ChatInputIconButton from "./ChatInputIconButton";
import ChatPopoverShell from "./ChatPopoverShell";
import type { QuickReactionMode } from "./chatInputData";
import {
  focusFieldAt,
  insertAtCursor,
  LIVE_TALK_SUPPORTS_ATTACHMENTS,
} from "./chatInputUtils";
import { useChatInputPopover } from "./useChatInputPopover";

const EmojiPickerPopover = dynamic(() => import("./EmojiPickerPopover"), {
  ssr: false,
});
const GifStickerPickerPopover = dynamic(
  () => import("./GifStickerPickerPopover"),
  { ssr: false },
);
const QuickReactionPopover = dynamic(() => import("./QuickReactionPopover"), {
  ssr: false,
});

export type ChatInputPanel = "emoji" | "sticker" | "reaction" | null;

type ChatInputActionsProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSendQuickReaction: (emoji: string) => void;
  disabled?: boolean;
};

export default function ChatInputActions({
  draft,
  onDraftChange,
  inputRef,
  onSendQuickReaction,
  disabled = false,
}: ChatInputActionsProps) {
  const [openPanel, setOpenPanel] = useState<ChatInputPanel>(null);
  const [quickMode, setQuickMode] = useState<QuickReactionMode>("send");
  const rootRef = useRef<HTMLDivElement>(null);

  const closePanel = useCallback(() => setOpenPanel(null), []);

  useChatInputPopover(openPanel !== null, closePanel, rootRef);

  const insertText = useCallback(
    (text: string) => {
      if (!text) {
        return;
      }
      const { value, cursor } = insertAtCursor(
        draft ?? "",
        text,
        inputRef.current,
      );
      onDraftChange(value);
      closePanel();
      focusFieldAt(inputRef.current, cursor);
    },
    [closePanel, draft, inputRef, onDraftChange],
  );

  const togglePanel = useCallback((panel: Exclude<ChatInputPanel, null>) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);

  const handleQuickSend = useCallback(
    (emoji: string) => {
      if (!emoji?.trim()) {
        return;
      }
      closePanel();
      onSendQuickReaction(emoji);
    },
    [closePanel, onSendQuickReaction],
  );

  return (
    <div
      ref={rootRef}
      className="relative flex max-w-[42%] shrink-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain sm:max-w-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ChatPopoverShell
        open={openPanel === "emoji"}
        anchorRef={rootRef}
        label="Emoji picker"
        width={260}
      >
        <EmojiPickerPopover onPick={insertText} />
      </ChatPopoverShell>

      <ChatPopoverShell
        open={openPanel === "sticker"}
        anchorRef={rootRef}
        label="GIF and stickers"
        width={280}
      >
        <GifStickerPickerPopover
          onPickSticker={insertText}
          onPickGifUrl={(url) => insertText(url ? ` ${url} ` : "")}
        />
      </ChatPopoverShell>

      <ChatPopoverShell
        open={openPanel === "reaction"}
        anchorRef={rootRef}
        label="Quick reactions"
        width={260}
      >
        <QuickReactionPopover
          mode={quickMode}
          onModeChange={setQuickMode}
          onSend={handleQuickSend}
          onInsert={insertText}
        />
      </ChatPopoverShell>

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
        label="Attachments not supported in room chat"
        disabled
      />
      {!LIVE_TALK_SUPPORTS_ATTACHMENTS ? (
        <span className="sr-only">Attachments disabled for room chat</span>
      ) : null}
    </div>
  );
}
