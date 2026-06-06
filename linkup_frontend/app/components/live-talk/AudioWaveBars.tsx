"use client";

import { memo } from "react";

type AudioWaveBarsProps = {
  active: boolean;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Lightweight CSS-only voice activity bars (no canvas / no rAF loops).
 */
function AudioWaveBarsComponent({
  active,
  className = "",
  size = "md",
}: AudioWaveBarsProps) {
  if (!active) {
    return null;
  }

  const heightClass = size === "sm" ? "h-3" : "h-3.5";

  return (
    <span
      className={`inline-flex ${heightClass} items-end gap-[2px] text-emerald-500 dark:text-emerald-400 ${className}`}
      aria-hidden
    >
      <span className="linkup-lt-wave-bar linkup-lt-wave-bar-0" />
      <span className="linkup-lt-wave-bar linkup-lt-wave-bar-1" />
      <span className="linkup-lt-wave-bar linkup-lt-wave-bar-2" />
      <span className="linkup-lt-wave-bar linkup-lt-wave-bar-3" />
    </span>
  );
}

export default memo(AudioWaveBarsComponent);
