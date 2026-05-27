type ChatListItemProps = {
  name: string;
  lastMessage: string;
  time: string;
  avatarUrl?: string | null;
  unread?: number;
  active?: boolean;
  onClick?: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

export default function ChatListItem({
  name,
  lastMessage,
  time,
  avatarUrl,
  unread,
  active,
  onClick,
}: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start justify-between rounded-[1.75rem] border p-4 text-left transition duration-300 ${
        active
          ? "border-violet-400/40 bg-violet-500/10"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/85 dark:hover:bg-white/5"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-3xl object-cover ring-2 ring-violet-500/20"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-semibold text-white">
            {getInitials(name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
            {lastMessage}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 pl-2 text-right">
        <span className="text-xs text-slate-500 dark:text-slate-400">{time}</span>
        {unread && unread > 0 ? (
          <span className="rounded-full bg-violet-500 px-2 py-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>
    </button>
  );
}
