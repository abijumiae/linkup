const tabs = ["Posts", "Reels", "Groups", "Saved"];

export default function ProfileTabs() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-violet-500/20 backdrop-blur-xl">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
              tab === "Posts"
                ? "bg-violet-500 text-slate-950"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
