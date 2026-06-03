export const ALLOWED_REACTION_EMOJIS = [
  '👏',
  '😊',
  '🤲',
  '😁',
  '🤣',
  '😍',
] as const;

export type AllowedReactionEmoji = (typeof ALLOWED_REACTION_EMOJIS)[number];

export function isAllowedReactionEmoji(
  value: string,
): value is AllowedReactionEmoji {
  return (ALLOWED_REACTION_EMOJIS as readonly string[]).includes(value);
}
