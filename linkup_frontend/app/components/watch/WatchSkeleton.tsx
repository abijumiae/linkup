export function WatchHeaderSkeleton() {
  return (
    <div className="linkup-panel mb-8 animate-pulse p-6 sm:p-7">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-full max-w-xl rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-11 w-full max-w-md rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function WatchMomentsSkeleton() {
  return (
    <div className="linkup-panel mb-6 animate-pulse p-4 sm:p-5">
      <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 flex gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex w-[4.75rem] flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-white/10 sm:h-16 sm:w-16" />
            <div className="h-3 w-10 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WatchCardSkeleton() {
  return (
    <div className="linkup-panel animate-pulse overflow-hidden p-0">
      <div className="aspect-video bg-slate-200 dark:bg-white/10" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-8 w-full rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}
