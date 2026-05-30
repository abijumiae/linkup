"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { Bookmark, Mail, ShoppingBag } from "lucide-react";
import {
  formatPrice,
  MarketplaceItem,
} from "@/src/lib/marketplace";
import {
  formatListingStatus,
} from "@/src/lib/marketConstants";
import {
  isMarketFavorite,
  toggleMarketFavorite,
} from "@/src/lib/marketFavorites";

type MarketplaceCardProps = {
  item: MarketplaceItem;
};

function getInitials(name: string): string {
  return (name[0] ?? "S").toUpperCase();
}

function MarketplaceCardComponent({ item }: MarketplaceCardProps) {
  const [saved, setSaved] = useState(() => isMarketFavorite(item.id));
  const status = formatListingStatus(item.status);

  function handleToggleSave(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaved(toggleMarketFavorite(item.id));
  }

  return (
    <article className="linkup-panel group flex h-full flex-col overflow-hidden p-0 transition duration-200 hover:border-brand-primary/25 hover:shadow-lg hover:shadow-brand-primary/10">
      <div className="relative">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-primary/15 via-slate-100 to-brand-secondary/10 dark:from-brand-primary/20 dark:via-brand-dark dark:to-brand-dark">
            <ShoppingBag className="h-12 w-12 text-brand-primary/40 dark:text-brand-secondary/50" />
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleSave}
          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition ${
            saved
              ? "border-brand-primary/40 bg-brand-primary text-white"
              : "border-white/30 bg-black/35 text-white hover:bg-black/50"
          }`}
          aria-label={saved ? "Remove bookmark" : "Bookmark listing"}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            status === "Sold"
              ? "bg-slate-900/75 text-white"
              : "bg-emerald-500/90 text-white"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
            {item.category}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
          {item.title}
        </h3>

        <p className="mt-2 text-xl font-semibold text-brand-primary dark:text-brand-secondary">
          {formatPrice(item.price, item.currency)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {item.seller.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.seller.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-primary/15"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-semibold text-white">
              {getInitials(item.seller.name)}
            </div>
          )}
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {item.seller.name}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/marketplace/${item.id}`}
            className="linkup-btn-secondary inline-flex flex-1 items-center justify-center min-h-[44px] text-xs font-semibold uppercase tracking-[0.12em]"
          >
            View Details
          </Link>
          {!item.isOwner ? (
            <Link
              href={`/messages?userId=${item.seller.id}&listingId=${item.id}`}
              className="linkup-btn-primary inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] text-xs font-semibold uppercase tracking-[0.12em]"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const MarketplaceCard = memo(MarketplaceCardComponent);
MarketplaceCard.displayName = "MarketplaceCard";

export default MarketplaceCard;
