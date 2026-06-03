"use client";

import type { LucideIcon } from "lucide-react";

type ChatInputIconButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export default function ChatInputIconButton({
  icon: Icon,
  label,
  active = false,
  highlight = false,
  disabled = false,
  onClick,
}: ChatInputIconButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      aria-label={label}
      title={label}
      className={`linkup-focus-ring linkup-lt-chat-icon-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-150 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:w-10 ${
        active || highlight
          ? "border border-brand-primary/40 bg-brand-primary/15 text-brand-primary shadow-sm shadow-brand-primary/10 dark:border-brand-secondary/40 dark:bg-brand-primary/25 dark:text-brand-secondary"
          : "border border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-200/90 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
      } ${highlight ? "linkup-lt-emoji-btn-glow" : ""}`}
    >
      <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
    </button>
  );
}
