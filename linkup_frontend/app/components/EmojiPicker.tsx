"use client";

const EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "🎉", "💜", "✨", "🙌", "😎", "💬", "🚀"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div className="absolute bottom-full left-0 z-10 mb-2 grid w-[min(100vw-2rem,240px)] grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-brand-dark">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-lg p-1.5 text-lg transition hover:bg-slate-100 dark:hover:bg-white/10"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
