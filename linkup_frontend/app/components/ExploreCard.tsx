type ExploreCardProps = {
  title: string;
  label: string;
  description: string;
  accent?: string;
};

export default function ExploreCard({ title, label, description, accent = "from-violet-500/20 to-sky-400/10" }: ExploreCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-lg shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/20 backdrop-blur-xl">
      <div className={`mb-3 inline-flex rounded-3xl bg-gradient-to-r ${accent} px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100`}>
        {label}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
