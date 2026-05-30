import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

type LocalPulseCardProps = {
  country?: string | null;
  enabled?: boolean;
};

const localPulseItems = [
  {
    title: "Trending near you",
    description: "Sparks and topics gaining momentum locally.",
    href: "/explore",
    icon: TrendingUp,
  },
  {
    title: "Local creators",
    description: "People building community around you.",
    href: "/explore",
    icon: Users,
  },
  {
    title: "Nearby happenings",
    description: "Events and meetups worth showing up for.",
    href: "/events",
    icon: CalendarDays,
  },
  {
    title: "Work near you",
    description: "Roles and projects in your area.",
    href: "/jobs",
    icon: Briefcase,
  },
] as const;

export default function LocalPulseCard({
  country,
  enabled = true,
}: LocalPulseCardProps) {
  const locationLabel = country?.trim() || "your area";

  return (
    <div className="linkup-panel p-5">
      <p className="linkup-eyebrow">Local Pulse</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
        What&apos;s moving near you
      </h2>
      {enabled && country ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-brand-primary dark:text-brand-secondary" />
            Trending in {locationLabel}
          </p>
          <div className="mt-4 space-y-2.5">
            {localPulseItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-3 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 active:scale-[0.99] dark:border-white/10 dark:bg-brand-dark/70 dark:hover:border-brand-secondary/25 dark:hover:bg-brand-primary/10"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                  <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-primary/0 transition group-hover:text-brand-primary dark:group-hover:text-brand-secondary" />
                </Link>
              );
            })}
          </div>
          <Link
            href={`/explore?q=${encodeURIComponent(locationLabel)}`}
            className="mt-4 inline-flex text-sm font-semibold text-brand-primary transition hover:text-brand-primary-hover dark:text-brand-secondary"
          >
            Explore Local Pulse →
          </Link>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/60 dark:text-slate-400">
          <MapPin className="mb-2 h-5 w-5 text-brand-primary dark:text-brand-secondary" />
          Local Pulse will highlight momentum near you once your country is set
          in profile or settings.
          <Link
            href="/settings"
            className="mt-3 block font-semibold text-brand-primary dark:text-brand-secondary"
          >
            Update location →
          </Link>
        </div>
      )}
    </div>
  );
}
