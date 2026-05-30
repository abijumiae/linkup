"use client";

import Link from "next/link";
import { Flame, Sparkles, Tag } from "lucide-react";
import { formatPrice, MarketplaceItem } from "@/src/lib/marketplace";
import { MARKET_CATEGORIES } from "@/src/lib/marketConstants";

type MarketSidebarProps = {
  suggested: MarketplaceItem[];
  trending: MarketplaceItem[];
  activeCategory: string | null;
  onCategorySelect: (category: string | null) => void;
};

export default function MarketSidebar({
  suggested,
  trending,
  activeCategory,
  onCategorySelect,
}: MarketSidebarProps) {
  return (
    <aside className="space-y-5">
      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Suggested for you
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {suggested.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Listings will appear here as the market grows.
            </li>
          ) : (
            suggested.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/marketplace/${item.id}`}
                  className="flex gap-3 rounded-xl border border-slate-200/90 p-2.5 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:hover:bg-brand-primary/10"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                      {item.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-brand-primary dark:text-brand-secondary">
                      {formatPrice(item.price, item.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Trending items
          </h2>
        </div>
        <ul className="mt-4 space-y-2">
          {trending.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              No trending items yet.
            </li>
          ) : (
            trending.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/marketplace/${item.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary dark:text-brand-secondary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-brand-primary dark:text-brand-secondary">
                    {formatPrice(item.price, item.currency)}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="linkup-panel p-5">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Categories
          </h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {MARKET_CATEGORIES.filter((c) => c !== "All").map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                onCategorySelect(activeCategory === category ? null : category)
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === category
                  ? "border-brand-primary/50 bg-brand-primary text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
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
