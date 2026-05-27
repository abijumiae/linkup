import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  linkupBtnPrimary,
  linkupEmpty,
} from "@/src/lib/linkupStyles";

type LinkUpEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export default function LinkUpEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: LinkUpEmptyStateProps) {
  return (
    <div className={`${linkupEmpty} p-8 text-center sm:p-10`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-sky-500/10 text-violet-600 dark:text-violet-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={`${linkupBtnPrimary} mt-5`}>
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <button type="button" onClick={onAction} className={`${linkupBtnPrimary} mt-5`}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
