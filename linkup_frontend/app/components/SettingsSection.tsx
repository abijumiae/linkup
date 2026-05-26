type SettingsSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
