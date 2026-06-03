"use client";

import { useCallback, useEffect, useState } from "react";
import ReactionButton from "./ReactionButton";
import {
  emptyReactionSummaries,
  type LinkupReactionEmoji,
  type ReactionSummary,
} from "@/src/lib/reactions";

type ReactionBarProps = {
  reactions: ReactionSummary[];
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onToggle: (emoji: LinkupReactionEmoji) => Promise<ReactionSummary[] | void>;
};

export default function ReactionBar({
  reactions: initialReactions,
  loading = false,
  disabled = false,
  compact = false,
  className = "",
  onToggle,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(
    initialReactions.length > 0 ? initialReactions : emptyReactionSummaries(),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialReactions.length > 0) {
      setReactions(initialReactions);
    }
  }, [initialReactions]);

  const handleToggle = useCallback(
    async (emoji: LinkupReactionEmoji) => {
      if (disabled || loading || busy) {
        return;
      }
      setBusy(true);
      try {
        const next = await onToggle(emoji);
        if (next?.length) {
          setReactions(next);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, disabled, loading, onToggle],
  );

  return (
    <div
      className={`flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2 ${className}`}
      role="toolbar"
      aria-label="Reactions"
    >
      {reactions.map((item) => (
        <ReactionButton
          key={item.emoji}
          emoji={item.emoji}
          count={item.count}
          active={item.reactedByMe}
          compact={compact}
          disabled={disabled || loading || busy}
          onClick={handleToggle}
        />
      ))}
    </div>
  );
}
