const CHAT_COLOR_PALETTE = [
  "from-violet-500 to-blue-500",
  "from-fuchsia-500 to-purple-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
] as const;

export function getStableColorKey(id?: string | null): number {
  const safe = id || "default";
  let hash = 0;
  for (let i = 0; i < safe.length; i++) {
    hash = (hash * 31 + safe.charCodeAt(i)) >>> 0;
  }
  return hash % CHAT_COLOR_PALETTE.length;
}

export function getChatGradient(id?: string | null): string {
  return CHAT_COLOR_PALETTE[getStableColorKey(id)];
}

export function getChatInitialsClass(id?: string | null): string {
  return `bg-gradient-to-br ${getChatGradient(id)}`;
}

export function getChatRingClass(id?: string | null): string {
  const index = getStableColorKey(id);
  const rings = [
    "ring-violet-400/40",
    "ring-fuchsia-400/40",
    "ring-sky-400/40",
    "ring-emerald-400/40",
    "ring-amber-400/40",
    "ring-rose-400/40",
  ] as const;
  return rings[index];
}

export function getChatSenderLabelClass(id?: string | null): string {
  const index = getStableColorKey(id);
  const labels = [
    "text-violet-600 dark:text-violet-300",
    "text-fuchsia-600 dark:text-fuchsia-300",
    "text-sky-600 dark:text-sky-300",
    "text-emerald-600 dark:text-emerald-300",
    "text-amber-600 dark:text-amber-300",
    "text-rose-600 dark:text-rose-300",
  ] as const;
  return labels[index];
}
