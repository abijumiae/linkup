import { Radio } from "lucide-react";

type LiveRoomCardProps = {
  title: string;
  subtitle: string;
  onClick?: () => void;
};

export default function LiveRoomCard({
  title,
  subtitle,
  onClick,
}: LiveRoomCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-start gap-3 rounded-3xl border border-dashed border-rose-500/25 bg-gradient-to-r from-rose-500/5 to-brand-primary/5 p-4 text-left transition hover:border-rose-500/40 hover:bg-rose-500/10 dark:from-rose-500/10 dark:to-brand-primary/10"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
        <Radio className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            Live
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {subtitle}
        </p>
      </div>
      <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
    </button>
  );
}
