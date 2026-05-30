export function ChatsListSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[0, 1, 2, 3, 4].map((key) => (
        <div
          key={key}
          className="flex items-start gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/85"
        >
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-200 dark:bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-full max-w-[180px] rounded-full bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatsThreadSkeleton() {
  return (
    <div className="flex h-[min(72vh,760px)] flex-col animate-pulse">
      <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
        <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
      <div className="flex-1 space-y-4 px-5 py-6">
        <div className="flex justify-start">
          <div className="h-16 w-[60%] max-w-xs rounded-3xl bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="flex justify-end">
          <div className="h-14 w-[55%] max-w-xs rounded-3xl bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="flex justify-start">
          <div className="h-20 w-[65%] max-w-sm rounded-3xl bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
      <div className="border-t border-slate-200/80 px-4 py-4 dark:border-white/10">
        <div className="h-12 rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}
