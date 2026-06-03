/** Emoji picker — full set for Hub Live Talk */
export const LIVE_TALK_PICKER_EMOJIS = [
  "😀",
  "😄",
  "😂",
  "😍",
  "❤️",
  "👍",
  "👏",
  "🙌",
  "🔥",
  "😢",
  "😮",
  "😎",
  "🎉",
  "🤲",
  "😊",
  "😁",
  "🤣",
] as const;

/** Local sticker fallback when Giphy is unavailable */
export const LIVE_TALK_STICKERS = [
  "✨",
  "💫",
  "🌟",
  "🎭",
  "🦄",
  "🎯",
  "💜",
  "🎪",
  "🎉",
  "🔥",
] as const;

export type LiveTalkQuickReaction = {
  emoji: string;
  label: string;
  animation: string;
};

export const LIVE_TALK_QUICK_REACTIONS: LiveTalkQuickReaction[] = [
  { emoji: "👏", label: "Clap", animation: "linkup-lt-react-pop" },
  { emoji: "🔥", label: "Fire", animation: "linkup-lt-react-rise" },
  { emoji: "❤️", label: "Love", animation: "linkup-lt-react-pulse" },
  { emoji: "😂", label: "Laugh", animation: "linkup-lt-react-wiggle" },
  { emoji: "🙌", label: "Celebrate", animation: "linkup-lt-react-pop" },
  { emoji: "🤲", label: "Thanks", animation: "linkup-lt-react-pulse" },
  { emoji: "😊", label: "Smile", animation: "linkup-lt-react-rise" },
  { emoji: "🤣", label: "LOL", animation: "linkup-lt-react-wiggle" },
];

export type QuickReactionMode = "send" | "insert";
