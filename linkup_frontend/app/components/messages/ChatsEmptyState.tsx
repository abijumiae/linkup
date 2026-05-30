import Link from "next/link";
import { LucideIcon } from "lucide-react";

type ChatsEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export default function ChatsEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: ChatsEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300/90 bg-gradient-to-br from-white to-slate-50/80 p-6 text-center dark:border-white/15 dark:from-brand-dark/80 dark:to-brand-dark/60 sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="linkup-btn-primary mt-5 inline-flex min-h-[44px]">
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="linkup-btn-primary mt-5 inline-flex min-h-[44px]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
