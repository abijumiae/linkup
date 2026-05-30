export function WorkCardSkeleton() {
  return (
    <div className="linkup-panel animate-pulse p-5">
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-5/6 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="mt-5 h-10 w-full rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}
