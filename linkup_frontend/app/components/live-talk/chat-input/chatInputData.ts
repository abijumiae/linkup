/** Common emojis for Live Talk room chat picker */
export const LIVE_TALK_PICKER_EMOJIS = [
  "😀",
  "😄",
  "😂",
  "😍",
  "👍",
  "❤️",
  "🔥",
  "👏",
  "🙌",
  "😢",
  "😮",
  "😎",
  "🎉",
] as const;

/** Sticker-style inserts (GIF button — emoji stickers, no external API) */
export const LIVE_TALK_STICKERS = [
  "✨",
  "💫",
  "🌟",
  "🎭",
  "🦄",
  "🎯",
  "💜",
  "🎪",
] as const;

export type LiveTalkQuickReaction = {
  emoji: string;
  label: string;
  animation: string;
};

/** Quick reactions with unique micro-animations */
export const LIVE_TALK_QUICK_REACTIONS: LiveTalkQuickReaction[] = [
  { emoji: "👏", label: "Clap", animation: "linkup-lt-react-pop" },
  { emoji: "🔥", label: "Fire", animation: "linkup-lt-react-rise" },
  { emoji: "❤️", label: "Love", animation: "linkup-lt-react-pulse" },
  { emoji: "😂", label: "Laugh", animation: "linkup-lt-react-wiggle" },
  { emoji: "🙌", label: "Celebrate", animation: "linkup-lt-react-pop" },
  { emoji: "✨", label: "Sparkle", animation: "linkup-lt-react-rise" },
];
