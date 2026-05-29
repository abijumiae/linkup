import Link from "next/link";
import { Sparkles, UserPlus } from "lucide-react";

type CreatorSpotlightProps = {
  creators: { name: string; focus?: string }[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CreatorSpotlight({ creators }: CreatorSpotlightProps) {
  return (
    <div className="linkup-panel p-5">
      <p className="linkup-eyebrow">Creator Spotlight</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        People creating momentum
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        People creating momentum on LinkUp.
      </p>
      <div className="mt-4 space-y-3">
        {creators.map((creator) => {
          const username = creator.name.toLowerCase().replace(/\s+/g, "");
          return (
            <div
              key={creator.name}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-brand-dark/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                  {getInitials(creator.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {creator.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    @{username}
                  </p>
                  {creator.focus ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-brand-primary dark:text-brand-secondary">
                      <Sparkles className="h-3 w-3" />
                      {creator.focus}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/explore?q=${encodeURIComponent(creator.name)}`}
                  className="linkup-btn-secondary min-h-[36px] flex-1 px-3 py-2 text-xs"
                >
                  View Profile
                </Link>
                <Link
                  href="/explore"
                  className="linkup-btn-primary min-h-[36px] flex-1 px-3 py-2 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Connect
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
