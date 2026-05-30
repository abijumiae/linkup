"use client";

function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10 ${className}`}
    />
  );
}

export function DiscoverPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="linkup-panel p-6 sm:p-7">
        <Block className="h-3 w-24" />
        <Block className="mt-4 h-8 w-40" />
        <Block className="mt-3 h-4 w-full max-w-xl" />
        <Block className="mt-6 h-12 w-full max-w-2xl rounded-full" />
      </div>
      <div className="linkup-panel p-3">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Block key={index} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Block key={index} className="h-36" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Block key={index} className="h-28" />
        ))}
      </div>
    </div>
  );
}

export function DiscoverSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Block key={index} className="h-24" />
      ))}
    </div>
  );
}
