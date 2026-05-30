"use client";

import Link from "next/link";
import { memo } from "react";
import { Mail, MapPin, ShoppingBag, Tag } from "lucide-react";
import { formatPrice, MarketplaceItem } from "@/src/lib/marketplace";

type MarketplaceCardProps = {
  item: MarketplaceItem;
};

function MarketplaceCard({ item }: MarketplaceCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-brand-primary/10 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-primary/15 via-slate-100 to-brand-secondary/10 dark:from-brand-primary/20 dark:via-brand-dark dark:to-brand-dark">
          <ShoppingBag className="h-12 w-12 text-brand-primary/40 dark:text-brand-secondary/50" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
            {item.category}
          </span>
          {item.condition ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <Tag className="h-3 w-3" />
              {item.condition}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
          {item.title}
        </h3>

        <p className="mt-2 text-xl font-semibold text-brand-primary dark:text-brand-secondary">
          {formatPrice(item.price, item.currency)}
        </p>

        {item.location ? (
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary dark:text-brand-secondary" />
            {item.location}
          </p>
        ) : null}

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {item.description}
        </p>

        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Seller:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {item.seller.name}
          </span>
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/marketplace/${item.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:border-brand-primary/40 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            View Details
          </Link>
          {!item.isOwner ? (
            <Link
              href={`/messages?userId=${item.seller.id}&listingId=${item.id}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
            >
              <Mail className="h-3.5 w-3.5" />
              Message Seller
            </Link>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-primary dark:text-brand-secondary">
              Your drop
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(MarketplaceCard);
