"use client";

import { useState } from "react";

const tabs = ["Sparks", "Moments", "Hubs", "Work", "Saved"] as const;
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
    <div className="linkup-panel p-3 sm:p-4">
      <div className="linkup-chip-row">
        <div className="flex min-w-min gap-2">
          {tabs.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`inline-flex shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  isActive
                    ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                    : "border border-slate-200/90 bg-white text-slate-700 hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200 dark:hover:bg-brand-primary/10"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { tabs as profileTabs };
