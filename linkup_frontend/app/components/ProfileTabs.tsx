const tabs = ["Posts", "Reels", "Groups", "Saved"];

export default function ProfileTabs() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
              tab === "Posts"
                ? "bg-violet-500 text-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
