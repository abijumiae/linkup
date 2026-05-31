"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ProfileUser } from "@/src/lib/users";

type ProfileCompletionCardProps = {
  user: ProfileUser;
  hasActiveMoment?: boolean;
};

type CompletionItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export default function ProfileCompletionCard({
  user,
  hasActiveMoment = false,
}: ProfileCompletionCardProps) {
  const items: CompletionItem[] = [
    {
      id: "bio",
      label: "Add bio",
      done: Boolean(user.bio?.trim()),
    },
    {
      id: "avatar",
      label: "Add avatar",
      done: Boolean(user.avatarUrl),
    },
    {
      id: "cover",
      label: "Add Pulse Cover",
      done: Boolean(user.coverUrl),
    },
    {
      id: "interests",
      label: "Add interests & skills",
      done: Boolean(user.interests?.trim() || user.skills?.trim()),
    },
    {
      id: "website",
      label: "Add website or link",
      done: Boolean(user.website?.trim()),
    },
    {
      id: "open",
      label: "Set open to connect",
      done: Boolean(user.openToConnect?.trim()),
    },
    {
      id: "hub",
      label: "Join a hub",
      done: (user.hubsCount ?? 0) > 0,
      href: "/groups",
    },
    {
      id: "spark",
      label: "Drop first Spark",
      done: (user.postsCount ?? 0) > 0,
      href: "/home",
    },
    {
      id: "connect",
      label: "Connect with people",
      done: (user.followingCount ?? 0) > 0,
      href: "/explore",
    },
  ];

  if (hasActiveMoment) {
    items.push({
      id: "moment",
      label: "Drop a Moment",
      done: true,
    });
  }

  const completed = items.filter((item) => item.done).length;
  const progress = Math.round((completed / items.length) * 100);

  if (progress >= 100) {
    return null;
  }

  return (
    <section className="linkup-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="linkup-eyebrow">LinkUp Card</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            Complete your LinkUp Card
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {progress}% complete — a fuller card helps people connect with you.
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-sm font-bold text-brand-primary dark:text-brand-secondary">
          {progress}%
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.href && !item.done ? (
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-sm transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/60 dark:hover:bg-brand-primary/10"
              >
                <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-dark/60">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span
                  className={
                    item.done
                      ? "text-slate-500 line-through dark:text-slate-400"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {item.label}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
