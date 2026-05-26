import { Bell, Briefcase, CalendarDays, Heart, MessageCircle, ShoppingBag, UserPlus, Users } from "lucide-react";
import type { NotificationType } from "@/src/lib/notifications";

type NotificationItemProps = {
  type: NotificationType;
  actorName: string;
  message: string;
  time: string;
  unread?: boolean;
  onClick?: () => void;
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

const iconColorMap = {
  LIKE: "text-pink-400",
  COMMENT: "text-sky-300",
  FOLLOW: "text-violet-300",
  GROUP_JOIN: "text-emerald-300",
  MARKETPLACE_INQUIRY: "text-amber-300",
  JOB_APPLICATION: "text-cyan-300",
  EVENT_JOIN: "text-indigo-300",
};

export default function NotificationItem({
  type,
  actorName,
  message,
  time,
  unread,
  onClick,
}: NotificationItemProps) {
  const Icon = iconMap[type] ?? Bell;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-4 text-left transition duration-300 ${
        unread
          ? "border-violet-400/30 bg-violet-500/10"
          : "hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300">
          <Icon className={`h-5 w-5 ${iconColorMap[type]}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{actorName}</p>
          <p className="mt-1 text-sm text-slate-300">{message}</p>
          <p className="mt-1 text-xs text-slate-500">{time}</p>
        </div>
      </div>
      {unread ? (
        <span className="rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950">
          New
        </span>
      ) : null}
    </button>
  );
}
