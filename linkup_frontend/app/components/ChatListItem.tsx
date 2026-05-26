type ChatListItemProps = {
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  active?: boolean;
  onClick?: () => void;
};

export default function ChatListItem({
  name,
  lastMessage,
  time,
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-lg font-semibold text-violet-600 dark:text-violet-300">
          {name[0]}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">{lastMessage}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        <span className="text-xs text-slate-500">{time}</span>
        {unread && unread > 0 ? (
          <span className="rounded-full bg-violet-500 px-2 py-1 text-[10px] font-semibold text-slate-950">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>
    </button>
  );
}
