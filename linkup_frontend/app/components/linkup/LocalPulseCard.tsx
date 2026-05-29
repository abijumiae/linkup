import Link from "next/link";
import { MapPin, TrendingUp } from "lucide-react";

type LocalPulseCardProps = {
  country?: string | null;
  enabled?: boolean;
};

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
            <MapPin className="h-4 w-4 shrink-0 text-brand-primary" />
            Trending in {locationLabel}
          </p>
          <div className="mt-4 space-y-2">
            {["Local creators", "Nearby happenings", "Work near you"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
                >
                  <TrendingUp className="h-4 w-4 text-brand-secondary" />
                  {item}
                </div>
              ),
            )}
          </div>
          <Link
            href={`/explore?q=${encodeURIComponent(locationLabel)}`}
            className="mt-4 inline-flex text-sm font-semibold text-brand-primary transition hover:text-brand-primary-hover dark:text-brand-secondary"
          >
            Explore Local Pulse →
          </Link>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/60 dark:text-slate-400">
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
