"use client";

import Link from "next/link";
import { Briefcase, Flame, Lightbulb, Sparkles, Users } from "lucide-react";
import { Job } from "@/src/lib/jobs";
import { WORK_CATEGORY_CHIPS } from "@/src/lib/workConstants";

type WorkSidebarProps = {
  trendingSkills: string[];
  activeCategory: string | null;
  onCategorySelect: (category: string | null) => void;
};

const WORK_TIPS = [
  "Lead with skills that match the role.",
  "Keep your profile updated for better matches.",
  "Apply early — fresh drops move fast.",
];

const FEATURED_HIRING = [
  { name: "Creator studios", href: "/explore" },
  { name: "Startup hubs", href: "/groups" },
  { name: "Freelance circles", href: "/explore" },
];

export default function WorkSidebar({
  trendingSkills,
  activeCategory,
  onCategorySelect,
}: WorkSidebarProps) {
  return (
    <aside className="space-y-5">
      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Work tips
          </h2>
        </div>
        <ul className="mt-4 space-y-2">
          {WORK_TIPS.map((tip) => (
            <li
              key={tip}
              className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Trending skills
          </h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {trendingSkills.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Skills will appear as opportunities grow.
            </p>
          ) : (
            trendingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary dark:text-brand-secondary"
              >
                {skill}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Suggested hubs for work
          </h2>
        </div>
        <div className="mt-4 space-y-2">
          <Link
            href="/groups"
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 px-3 py-2.5 text-sm transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:hover:bg-brand-primary/10"
          >
            <Briefcase className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            Explore Hubs
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 px-3 py-2.5 text-sm transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:hover:bg-brand-primary/10"
          >
            <Sparkles className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            Discover creators hiring
          </Link>
        </div>
      </section>

      <section className="linkup-panel p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Featured hiring
        </h2>
        <ul className="mt-4 space-y-2">
          {FEATURED_HIRING.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="block rounded-xl px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="linkup-panel p-5 xl:hidden">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Quick categories
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {WORK_CATEGORY_CHIPS.filter((c) => c !== "All").map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                onCategorySelect(activeCategory === category ? null : category)
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeCategory === category
                  ? "border-brand-primary/50 bg-brand-primary text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
