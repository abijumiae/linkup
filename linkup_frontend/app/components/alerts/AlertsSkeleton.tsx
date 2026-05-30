export function AlertsHeaderSkeleton() {
  return (
    <div className="linkup-panel mb-6 animate-pulse p-6 sm:p-7">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-full max-w-lg rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-8 w-40 rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-20 shrink-0 rounded-full bg-slate-200 dark:bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}

export function AlertCardSkeleton() {
  return (
    <div className="linkup-panel animate-pulse p-4">
      <div className="flex gap-4">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
