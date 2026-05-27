"use client";

import { useState } from "react";

const tabs = ["Sparks", "Reels", "Hubs", "Saved"] as const;
export type ProfileTab = (typeof tabs)[number];

type ProfileTabsProps = {
  activeTab?: ProfileTab;
  onTabChange?: (tab: ProfileTab) => void;
};

export default function ProfileTabs({
  activeTab: controlledTab,
  onTabChange,
}: ProfileTabsProps) {
  const [internalTab, setInternalTab] = useState<ProfileTab>("Sparks");
  const activeTab = controlledTab ?? internalTab;

  function handleTabClick(tab: ProfileTab) {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20 sm:p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-md shadow-violet-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { tabs as profileTabs };
