export function SettingsHeaderSkeleton() {
  return (
    <div className="linkup-panel mb-8 animate-pulse p-6 sm:p-7">
      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-full max-w-xl rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export function SettingsSectionSkeleton() {
  return (
    <div className="linkup-panel animate-pulse p-6 sm:p-7">
      <div className="mb-5 h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
      <div className="space-y-4">
        <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function SettingsPageSkeleton() {
  return (
    <div className="linkup-page">
      <div className="linkup-container space-y-6">
        <SettingsHeaderSkeleton />
        {Array.from({ length: 4 }).map((_, index) => (
          <SettingsSectionSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
