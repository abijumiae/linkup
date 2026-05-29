import { Award, Flame, Rocket, Users } from "lucide-react";

type ActivityBadgesProps = {
  sparkCount?: number;
  hubCount?: number;
};

const badgeIcons = {
  streak: Flame,
  builder: Rocket,
  hub: Users,
} as const;

export default function ActivityBadges({
  sparkCount = 0,
  hubCount = 0,
}: ActivityBadgesProps) {
  const badges = [
    {
      id: "streak",
      label: sparkCount >= 3 ? "3-day Spark streak" : "Spark streak",
      active: sparkCount >= 1,
      hint: sparkCount >= 3 ? "Momentum building" : "Drop sparks to grow your streak",
    },
    {
      id: "builder",
      label: "Early Builder",
      active: sparkCount >= 1,
      hint: "Part of the LinkUp launch wave",
    },
    {
      id: "hub",
      label: "Hub Starter",
      active: hubCount >= 1,
      hint: hubCount >= 1 ? "Active in hubs" : "Join a hub to unlock",
    },
  ] as const;

  return (
    <section className="linkup-panel p-5">
      <p className="linkup-eyebrow">Activity</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Your LinkUp badges
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Light recognition for showing up and building momentum.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => {
          const Icon = badgeIcons[badge.id as keyof typeof badgeIcons] ?? Award;
          return (
            <span
              key={badge.id}
              title={badge.hint}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                badge.active
                  ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {badge.label}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
        Full streak tracking coming soon — badges update as you post and join hubs.
      </p>
    </section>
  );
}
