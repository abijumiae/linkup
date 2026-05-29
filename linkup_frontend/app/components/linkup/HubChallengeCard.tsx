"use client";

import { useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { getHubChallenge } from "@/src/lib/linkupFeatures";

type HubChallengeCardProps = {
  compact?: boolean;
};

export default function HubChallengeCard({ compact = false }: HubChallengeCardProps) {
  const challenge = getHubChallenge();
  const [joined, setJoined] = useState(false);

  return (
    <section
      className={`linkup-panel border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 via-white to-brand-secondary/5 dark:from-brand-primary/10 dark:via-brand-dark/90 dark:to-brand-secondary/10 ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="linkup-eyebrow">Hub Challenge</p>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Trophy className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
            {challenge.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {challenge.description}
          </p>
          {joined ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-primary dark:text-brand-secondary">
              <Sparkles className="h-4 w-4" />
              You joined this challenge — drop your spark in the hub feed.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setJoined(true)}
          disabled={joined}
          className="linkup-btn-primary shrink-0 min-h-[44px] disabled:opacity-70"
        >
          {joined ? "Joined" : "Join Challenge"}
        </button>
      </div>
    </section>
  );
}
