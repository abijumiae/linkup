/** Allowed LinkUp reaction emojis (must match backend validation). */
export const LINKUP_REACTION_EMOJIS = [
  "👏",
  "😊",
  "🤲",
  "😁",
  "🤣",
  "😍",
] as const;

export type LinkupReactionEmoji = (typeof LINKUP_REACTION_EMOJIS)[number];

export type ReactionSummary = {
  emoji: LinkupReactionEmoji;
  count: number;
  reactedByMe: boolean;
};

export type ReactionToggleResponse = {
  emoji: LinkupReactionEmoji;
  count: number;
  reactedByMe: boolean;
  reactions: ReactionSummary[];
};

export const REACTION_META: Record<
  LinkupReactionEmoji,
  { label: string; animation: string }
> = {
  "👏": { label: "Clap", animation: "linkup-reaction-pop" },
  "😊": { label: "Smile", animation: "linkup-reaction-bounce" },
  "🤲": { label: "Pray", animation: "linkup-reaction-pulse" },
  "😁": { label: "Grin", animation: "linkup-reaction-wiggle" },
  "🤣": { label: "Laugh", animation: "linkup-reaction-shake" },
  "😍": { label: "Love", animation: "linkup-reaction-heart" },
};

export function emptyReactionSummaries(): ReactionSummary[] {
  return LINKUP_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: 0,
    reactedByMe: false,
  }));
}

export function isLinkupReactionEmoji(value: string): value is LinkupReactionEmoji {
  return (LINKUP_REACTION_EMOJIS as readonly string[]).includes(value);
}
