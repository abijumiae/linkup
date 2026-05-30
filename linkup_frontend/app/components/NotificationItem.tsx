import Link from "next/link";
import {
  Bell,
  Briefcase,
  CalendarDays,
  Heart,
  MessageCircle,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";
import type { NotificationActor, NotificationType } from "@/src/lib/notifications";

type NotificationItemProps = {
  type: NotificationType;
  actor: NotificationActor;
  message: string;
  time: string;
  unread?: boolean;
  href?: string | null;
  actionLabel?: string;
  onMarkRead?: () => void;
};

const iconMap = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  FOLLOW: UserPlus,
  GROUP_JOIN: Users,
  MARKETPLACE_INQUIRY: ShoppingBag,
  JOB_APPLICATION: Briefcase,
  EVENT_JOIN: CalendarDays,
};

const typeLabelMap: Record<NotificationType, string> = {
  LIKE: "Boost",
  COMMENT: "Reply",
  FOLLOW: "Connect",
  GROUP_JOIN: "Hub",
  MARKETPLACE_INQUIRY: "Market",
  JOB_APPLICATION: "Work",
  EVENT_JOIN: "Happening",
};

const iconColorMap: Record<NotificationType, string> = {
  LIKE: "text-pink-500 dark:text-pink-400",
  COMMENT: "text-brand-secondary dark:text-brand-secondary",
  FOLLOW: "text-brand-primary dark:text-brand-secondary",
  GROUP_JOIN: "text-emerald-600 dark:text-emerald-400",
  MARKETPLACE_INQUIRY: "text-amber-600 dark:text-amber-400",
  JOB_APPLICATION: "text-brand-secondary dark:text-brand-secondary",
  EVENT_JOIN: "text-brand-primary dark:text-brand-secondary",
};

const badgeColorMap: Record<NotificationType, string> = {
  LIKE: "bg-pink-500/10 text-pink-700 dark:text-pink-200",
  COMMENT: "bg-brand-secondary/10 text-brand-primary dark:text-brand-secondary",
  FOLLOW: "bg-brand-primary/10 text-brand-primary dark:text-brand-secondary",
  GROUP_JOIN: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  MARKETPLACE_INQUIRY: "bg-amber-500/10 text-amber-700 dark:text-amber-200",
  JOB_APPLICATION: "bg-brand-secondary/10 text-brand-primary dark:text-brand-secondary",
  EVENT_JOIN: "bg-brand-primary/10 text-brand-primary dark:text-brand-secondary",
};

function getInitials(name: string, username: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? username[0] ?? "U").toUpperCase();
}

export default function NotificationItem({
  type,
  actor,
  message,
  time,
  unread = false,
  href,
  actionLabel,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = iconMap[type] ?? Bell;
  const typeLabel = typeLabelMap[type] ?? "Alert";

  return (
    <article
      className={`linkup-panel p-4 transition duration-200 ${
        unread
          ? "border-brand-primary/30 bg-brand-primary/5 dark:bg-brand-primary/10"
          : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {actor.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={actor.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-brand-primary/20"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
              {getInitials(actor.name, actor.username)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white shadow dark:border-brand-dark dark:bg-brand-dark">
            <Icon className={`h-3.5 w-3.5 ${iconColorMap[type]}`} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">
              {actor.name}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeColorMap[type]}`}
            >
              {typeLabel}
            </span>
            {unread ? (
              <span
                className="inline-flex h-2 w-2 rounded-full bg-brand-primary"
                aria-label="Unread alert"
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {message}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{time}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {href && actionLabel ? (
              <Link
                href={href}
                className="linkup-btn-secondary inline-flex min-h-[40px] items-center px-4 py-2 text-xs"
              >
                {actionLabel}
              </Link>
            ) : null}
            {unread && onMarkRead ? (
              <button
                type="button"
                onClick={onMarkRead}
                className="inline-flex min-h-[40px] items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                Mark read
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
