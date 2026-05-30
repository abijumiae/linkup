export function HappeningsHeaderSkeleton() {
  return (
    <div className="linkup-panel mb-8 animate-pulse p-6 sm:p-7">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-8 w-48 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-full max-w-xl rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-11 w-full rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function HappeningsCardSkeleton() {
  return (
    <div className="linkup-panel animate-pulse overflow-hidden p-0">
      <div className="aspect-[16/10] bg-slate-200 dark:bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-10 w-full rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}
