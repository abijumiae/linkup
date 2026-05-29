import { BOOST_REACTION_LABELS } from "@/src/lib/linkupFeatures";

/** UI-only reaction labels — backend like model unchanged */
export default function BoostReactionHints() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
        Boost as:
      </span>
      {BOOST_REACTION_LABELS.map((label) => (
        <span
          key={label}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
