"use client";

import { CalendarDays, Languages, MapPin, User } from "lucide-react";
import { ProfileUser } from "@/src/lib/users";
import {
  formatAccountType,
  formatLanguageLabel,
} from "@/src/lib/profileOptions";

type ProfileAboutSectionProps = {
  user: ProfileUser;
};

function formatJoinedDate(value: string | undefined) {
  if (!value) {
    return "Recently joined";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function ProfileAboutSection({ user }: ProfileAboutSectionProps) {
  const bioText = user.bio?.trim();

  return (
    <section className="linkup-panel p-5 sm:p-6">
      <p className="linkup-eyebrow">About</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        Your story on LinkUp
      </h2>

      <p
        className={`mt-4 text-sm leading-7 ${
          bioText
            ? "text-slate-700 dark:text-slate-300"
            : "italic text-slate-500 dark:text-slate-400"
        }`}
      >
        {bioText ||
          "Tell people what you're building, learning, or exploring."}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-3 dark:border-white/10 dark:bg-brand-dark/60">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Location
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">
              {user.country ?? "Not set"}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-3 dark:border-white/10 dark:bg-brand-dark/60">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Account type
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">
              {formatAccountType(user.accountType)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-3 dark:border-white/10 dark:bg-brand-dark/60">
          <Languages className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Language
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">
              {formatLanguageLabel(user.language)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-3 dark:border-white/10 dark:bg-brand-dark/60">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Joined
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">
              {formatJoinedDate(user.createdAt)}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
