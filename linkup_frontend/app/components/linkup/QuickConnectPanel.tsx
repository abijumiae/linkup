import Link from "next/link";
import { MessageCircle, UserPlus } from "lucide-react";

type QuickConnectSuggestion = {
  id: string;
  name: string;
  username: string;
  subtitle?: string;
};

type QuickConnectPanelProps = {
  suggestions?: QuickConnectSuggestion[];
  emptyMessage?: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

export default function QuickConnectPanel({
  suggestions = [],
  emptyMessage = "Quick Connect suggestions will appear as your network grows.",
}: QuickConnectPanelProps) {
  return (
    <div className="linkup-panel p-5">
      <p className="linkup-eyebrow">Quick Connect</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Suggested connections
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Creators and professionals worth connecting with.
      </p>
      <div className="mt-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/80 p-4 text-center dark:border-white/15 dark:bg-brand-dark/60">
            <UserPlus className="mx-auto h-5 w-5 text-brand-primary dark:text-brand-secondary" />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {emptyMessage}
            </p>
            <Link
              href="/explore"
              className="linkup-btn-secondary mt-4 inline-flex min-h-[40px] text-xs"
            >
              Discover people
            </Link>
          </div>
        ) : (
          suggestions.map((person) => (
            <div
              key={person.id}
              className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 px-4 py-3.5 dark:border-white/10 dark:from-brand-dark/85 dark:to-brand-dark/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/20">
                  {getInitials(person.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {person.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    @{person.username}
                  </p>
                  {person.subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {person.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/explore"
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover active:scale-[0.98]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Connect
                </Link>
                <Link
                  href={`/messages?userId=${encodeURIComponent(person.id)}`}
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 active:scale-[0.98] dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Start Chat
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
