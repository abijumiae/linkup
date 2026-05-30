export default function PulseFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, key) => (
        <div
          key={key}
          className="linkup-card animate-pulse p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-11/12 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
            {[0, 1, 2, 3].map((chip) => (
              <div
                key={chip}
                className="h-9 w-20 rounded-full bg-slate-200 dark:bg-white/10"
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
