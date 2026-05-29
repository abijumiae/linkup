type AdminStatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export default function AdminStatCard({ label, value, detail }: AdminStatCardProps) {
  return (
    <div className="card-float rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-brand-primary/20">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}
