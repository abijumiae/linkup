export function ProfileHeaderSkeleton() {
  return (
    <div className="linkup-panel overflow-hidden p-0 animate-pulse">
      <div className="h-28 bg-slate-200 dark:bg-white/10" />
      <div className="px-6 pb-6 pt-0">
        <div className="-mt-12 h-24 w-24 rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 h-7 w-48 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="mt-2 h-4 w-32 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-14 rounded-xl bg-slate-200 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileTabsSkeleton() {
  return (
    <div className="linkup-panel p-3 animate-pulse">
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="h-10 w-24 shrink-0 rounded-full bg-slate-200 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export function ProfileTabsContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1].map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-white/10 dark:bg-brand-dark/80"
        >
          <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 h-16 rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
