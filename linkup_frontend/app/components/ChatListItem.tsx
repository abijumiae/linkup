import { memo } from "react";

type ChatListItemProps = {
  name: string;
  lastMessage: string;
  time: string;
  avatarUrl?: string | null;
  unread?: number;
  active?: boolean;
  onClick?: () => void;
  variant?: "direct" | "group" | "live";
  online?: boolean;
  memberCount?: number;
  live?: boolean;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

const badgeLabels: Record<NonNullable<ChatListItemProps["variant"]>, string> = {
  direct: "Individual",
  group: "Group",
  live: "Live",
};

function ChatListItemComponent({
  name,
  lastMessage,
  time,
  avatarUrl,
  unread,
  active,
  onClick,
  variant = "direct",
  online,
  memberCount,
  live,
}: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 items-start justify-between gap-2 rounded-3xl border p-4 text-left transition duration-200 active:scale-[0.99] ${
        active
          ? "border-brand-primary/40 bg-gradient-to-r from-brand-primary/12 to-brand-secondary/8 shadow-md shadow-brand-primary/10 ring-1 ring-brand-primary/15"
          : "border-slate-200/80 bg-white hover:border-brand-primary/25 hover:bg-slate-50/90 dark:border-white/10 dark:bg-brand-dark/85 dark:hover:border-brand-secondary/25 dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-brand-primary/15"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/20">
              {getInitials(name)}
            </div>
          )}
          {(online || live) && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-brand-dark ${
                live ? "animate-pulse bg-rose-500" : "bg-emerald-500"
              }`}
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">
              {name}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                variant === "live"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : variant === "group"
                    ? "bg-brand-secondary/10 text-brand-secondary"
                    : "bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
              }`}
            >
              {badgeLabels[variant]}
            </span>
          </div>
          {memberCount !== undefined && memberCount > 0 ? (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </p>
          ) : null}
          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
            {lastMessage}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pl-1 text-right">
        {time ? (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {time}
          </span>
        ) : null}
        {unread && unread > 0 ? (
          <span className="min-w-[1.25rem] rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-2 py-0.5 text-center text-[10px] font-bold text-white shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>
    </button>
  );
}

const ChatListItem = memo(ChatListItemComponent);
ChatListItem.displayName = "ChatListItem";

export default ChatListItem;
