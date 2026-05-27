import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="linkup-panel p-6 sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300/80">
          {title}
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
