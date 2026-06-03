"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const linkupBtnMotion =
  "transition duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-brand-secondary/40";

export const linkupBtnDisabled =
  "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

export const linkupBtnVariants = {
  primary:
    "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-sm shadow-brand-primary/20 hover:shadow-md hover:shadow-brand-primary/25",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  ghost:
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
  hand: "bg-amber-500 text-white hover:bg-amber-600",
  handIdle:
    "bg-slate-100 text-brand-primary dark:bg-white/10 dark:text-brand-secondary",
  chip: "rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300",
  chipActive:
    "rounded-full bg-brand-primary/10 text-brand-primary dark:bg-brand-secondary/15 dark:text-brand-secondary",
  chipPink:
    "rounded-full bg-pink-500/10 text-pink-600 hover:bg-pink-500/15 dark:bg-pink-500/15 dark:text-pink-300",
} as const;

export type LinkupBtnVariant = keyof typeof linkupBtnVariants;

const iconSizes = {
  sm: { btn: "h-9 w-9 min-h-[36px] min-w-[36px]", icon: "h-4 w-4" },
  md: { btn: "h-11 w-11 min-h-[44px] min-w-[44px]", icon: "h-5 w-5" },
  lg: { btn: "h-12 w-12 min-h-[44px] min-w-[44px]", icon: "h-5 w-5" },
} as const;

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  variant?: LinkupBtnVariant;
  size?: keyof typeof iconSizes;
  "aria-label": string;
};

export function IconButton({
  icon: Icon,
  variant = "ghost",
  size = "md",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const s = iconSizes[size];
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${linkupBtnMotion} ${linkupBtnDisabled} ${linkupBtnVariants[variant]} ${s.btn} ${className}`}
      {...props}
    >
      <Icon className={s.icon} aria-hidden />
    </button>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  children?: ReactNode;
  variant?: LinkupBtnVariant;
  /** Hide label below `sm` breakpoint */
  compact?: boolean;
  /** Always screen-reader only label */
  iconOnly?: boolean;
  rounded?: "full" | "2xl";
};

export function ActionButton({
  icon: Icon,
  children,
  variant = "secondary",
  compact = false,
  iconOnly = false,
  rounded = "2xl",
  className = "",
  type = "button",
  ...props
}: ActionButtonProps) {
  const round = rounded === "full" ? "rounded-full" : "rounded-2xl";
  const labelClass = iconOnly
    ? "sr-only"
    : compact
      ? "hidden sm:inline"
      : "";

  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium ${round} ${linkupBtnMotion} ${linkupBtnDisabled} ${linkupBtnVariants[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {children ? <span className={labelClass}>{children}</span> : null}
    </button>
  );
}

type MobileActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label?: string;
  variant?: LinkupBtnVariant;
  "aria-label": string;
};

export function MobileActionButton({
  icon: Icon,
  label,
  variant = "ghost",
  className = "",
  type = "button",
  ...props
}: MobileActionButtonProps) {
  return (
    <button
      type={type}
      className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1 ${linkupBtnMotion} ${linkupBtnDisabled} ${linkupBtnVariants[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {label ? (
        <span className="max-w-[4.25rem] truncate text-[10px] font-semibold leading-tight">
          {label}
        </span>
      ) : null}
    </button>
  );
}

/** Compact pill for feed / spark toolbars */
export function ChipActionButton({
  icon: Icon,
  children,
  active = false,
  pink = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  children: ReactNode;
  active?: boolean;
  pink?: boolean;
}) {
  const variant = pink && active ? "chipPink" : active ? "chipActive" : "chip";
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center gap-2 px-3.5 py-2.5 text-sm font-medium ${linkupBtnMotion} ${linkupBtnDisabled} ${linkupBtnVariants[variant]} ${className}`}
      {...props}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${pink && active ? "fill-pink-400 text-pink-400" : ""}`}
        aria-hidden
      />
      {children}
    </button>
  );
}
