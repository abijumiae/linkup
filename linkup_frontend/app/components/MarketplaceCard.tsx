"use client";

import Link from "next/link";
import { MapPin, ShoppingBag } from "lucide-react";
import {
  formatPrice,
  MarketplaceItem,
} from "@/src/lib/marketplace";

type MarketplaceCardProps = {
  item: MarketplaceItem;
};

export default function MarketplaceCard({ item }: MarketplaceCardProps) {
  return (
    <article className="card-float flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/20 dark:border-white/10 dark:bg-slate-950/85">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-violet-500/20 via-slate-900 to-slate-950">
          <ShoppingBag className="h-10 w-10 text-violet-300/60" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-violet-300/80">
          {item.category}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{item.title}</h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {item.description}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-100 p-4 dark:bg-slate-900/80">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Price
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {formatPrice(item.price, item.currency)}
            </p>
          </div>
          {item.location && (
            <div className="rounded-3xl bg-slate-100 p-4 dark:bg-slate-900/80">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Location
              </p>
              <p className="mt-2 flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                {item.location}
              </p>
            </div>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Seller: {item.seller.name}</span>
        </div>
        <Link
          href={`/marketplace/${item.id}`}
          className="mt-5 inline-flex justify-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 transition hover:bg-violet-500/15 dark:border-white/10 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
