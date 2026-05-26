"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createListing,
  fetchMarketplaceItems,
  MarketplaceItem,
} from "@/src/lib/marketplace";
import { marketplaceCategories } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import MarketplaceCard from "./MarketplaceCard";

export default function MarketplacePageClient() {
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    category: marketplaceCategories[0] ?? "General",
    condition: "",
    location: "",
    imageUrl: "",
  });

  const loadItems = useCallback(
    async (filters?: { q?: string; category?: string }) => {
      try {
        const data = await fetchMarketplaceItems(filters);
        setItems(data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Unable to load marketplace listings. Please try again.");
      }
    },
    [router],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadItems();
      setIsLoading(false);
    }
    void init();
  }, [loadItems]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadItems({
      q: searchInput,
      category: activeCategory ?? undefined,
    });
    setIsLoading(false);
  };

  const handleCategoryFilter = async (category: string | null) => {
    setActiveCategory(category);
    setIsLoading(true);
    await loadItems({
      q: searchInput || undefined,
      category: category ?? undefined,
    });
    setIsLoading(false);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      setCreateError("Please enter a valid price.");
      setIsCreating(false);
      return;
    }

    try {
      const created = await createListing({
        title: form.title.trim(),
        description: form.description.trim(),
        price,
        currency: form.currency.trim() || "USD",
        category: form.category.trim(),
        condition: form.condition.trim() || undefined,
        location: form.location.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        price: "",
        currency: "USD",
        category: marketplaceCategories[0] ?? "General",
        condition: "",
        location: "",
        imageUrl: "",
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create listing.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && items.length === 0) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                Marketplace
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Find services, templates, and launch-ready products
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
            >
              <Plus className="h-4 w-4" />
              Create listing
            </button>
          </div>
          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1 rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950/80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent pl-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Search listings"
              />
            </div>
            <button
              type="submit"
              className="rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Search
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleCategoryFilter(null)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeCategory === null
                  ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              All
            </button>
            {marketplaceCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryFilter(category)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeCategory === category
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            No listings found. Create the first one.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <MarketplaceCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create listing</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                placeholder="Description"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Price"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                />
                <input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  placeholder="Currency (USD)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                />
              </div>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400/50"
              >
                {marketplaceCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                value={form.condition}
                onChange={(e) =>
                  setForm({ ...form, condition: e.target.value })
                }
                placeholder="Condition (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Location (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="Image URL (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              {createError && (
                <p className="text-sm text-red-600 dark:text-red-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Publish listing"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
