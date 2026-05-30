"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  MARKET_CATEGORIES,
  MARKET_SORT_OPTIONS,
  MarketSort,
} from "@/src/lib/marketConstants";
import {
  fetchMarketplaceItemsSafe,
  MarketplaceFilters,
  MarketplaceItem,
  sortMarketplaceItems,
} from "@/src/lib/marketplace";
import CreateListingModal from "./market/CreateListingModal";
import MarketSidebar from "./market/MarketSidebar";
import MarketplaceCard from "./MarketplaceCard";

function ListingSkeleton() {
  return (
    <div className="linkup-panel animate-pulse overflow-hidden p-0">
      <div className="aspect-[4/3] bg-slate-200 dark:bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-9 w-full rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

function MarketEmptyState({
  title,
  description,
  showCreate,
  onCreate,
}: {
  title: string;
  description: string;
  showCreate?: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300/90 bg-gradient-to-br from-white to-slate-50/80 p-10 text-center dark:border-white/15 dark:from-brand-dark/80 dark:to-brand-dark/60">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {showCreate && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="linkup-btn-primary mt-5 inline-flex min-h-[44px] items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Listing
        </button>
      ) : null}
    </div>
  );
}

export default function MarketplacePageClient() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<MarketplaceItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<MarketSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadItems = useCallback(
    async (filters: MarketplaceFilters, page = 1, append = false) => {
      const { items, hasMore: more, warning: loadWarning } =
        await fetchMarketplaceItemsSafe({
          ...filters,
          page,
          limit: 24,
        });

      setAllItems((current) => (append ? [...current, ...items] : items));
      setListPage(page);
      setHasMore(more);
      setWarning(loadWarning);
    },
    [],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        await loadItems({ sort: activeSort });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, [loadItems, router, activeSort]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.seller.name.toLowerCase().includes(q),
      );
    }

    if (activeCategory) {
      result = result.filter(
        (item) => item.category.toLowerCase() === activeCategory.toLowerCase(),
      );
    }

    return sortMarketplaceItems(result, activeSort);
  }, [allItems, searchInput, activeCategory, activeSort]);

  const suggested = useMemo(
    () => sortMarketplaceItems(allItems, "newest").slice(0, 4),
    [allItems],
  );

  const trending = useMemo(
    () => sortMarketplaceItems(allItems, "trending").slice(0, 5),
    [allItems],
  );

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
  };

  const handleCategoryFilter = async (category: string | null) => {
    setActiveCategory(category);
    setIsLoading(true);
    try {
      await loadItems({
        category: category ?? undefined,
        sort: activeSort,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasSearchQuery = searchInput.trim().length > 0;
  const isEmpty = filteredItems.length === 0;

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="linkup-panel mb-6 p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="linkup-eyebrow">LinkUp</p>
              <h1 className="linkup-title mt-2">Market</h1>
              <p className="linkup-subtitle mt-2">
                Buy, sell, and trade within your community
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="linkup-btn-primary inline-flex min-h-[44px] shrink-0 items-center gap-2 px-5"
            >
              <Plus className="h-4 w-4" />
              Create Listing
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6">
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/70">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Search listings, items, trades…"
              />
            </div>
          </form>

          <div className="mt-4 linkup-chip-row">
            <div className="flex min-w-min gap-2">
              {MARKET_CATEGORIES.map((category) => {
                const isActive =
                  category === "All"
                    ? activeCategory === null
                    : activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      handleCategoryFilter(
                        category === "All" ? null : category,
                      )
                    }
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                        : "border border-slate-200/90 bg-white text-slate-700 hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {MARKET_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveSort(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  activeSort === option.value
                    ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {warning ? (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ListingSkeleton key={index} />
                ))}
              </div>
            ) : isEmpty ? (
              <MarketEmptyState
                title={
                  hasSearchQuery
                    ? "No results found for your search"
                    : "No items yet"
                }
                description={
                  hasSearchQuery
                    ? "Try a different keyword or browse another category."
                    : "Start your first listing and bring the market to life."
                }
                showCreate={!hasSearchQuery}
                onCreate={() => setShowCreateModal(true)}
              />
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => (
                    <MarketplaceCard key={item.id} item={item} />
                  ))}
                </div>
                {hasMore && !hasSearchQuery ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingMore(true);
                        void loadItems(
                          {
                            category: activeCategory ?? undefined,
                            sort: activeSort,
                          },
                          listPage + 1,
                          true,
                        ).finally(() => setLoadingMore(false));
                      }}
                      disabled={loadingMore}
                      className="linkup-btn-secondary min-h-[44px] disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : "Load more listings"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="hidden xl:block">
            <MarketSidebar
              suggested={suggested}
              trending={trending}
              activeCategory={activeCategory}
              onCategorySelect={(category) => void handleCategoryFilter(category)}
            />
          </div>
        </div>

        <div className="mt-8 xl:hidden">
          <MarketSidebar
            suggested={suggested}
            trending={trending}
            activeCategory={activeCategory}
            onCategorySelect={(category) => void handleCategoryFilter(category)}
          />
        </div>
      </div>

      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(created) => {
          setAllItems((prev) => [
            created,
            ...prev.filter((item) => item.id !== created.id),
          ]);
        }}
      />
    </div>
  );
}
