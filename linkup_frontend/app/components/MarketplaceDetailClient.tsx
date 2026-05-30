"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  HandCoins,
  Mail,
  MessageSquare,
  Pencil,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  formatListingStatus,
  MARKET_CATEGORIES,
  parseTagsFromDescription,
} from "@/src/lib/marketConstants";
import {
  deleteListing,
  fetchMarketplaceItem,
  formatPrice,
  MarketplaceItem,
  updateListing,
} from "@/src/lib/marketplace";
import MarketImageCarousel from "./market/MarketImageCarousel";

type MarketplaceDetailClientProps = {
  itemId: string;
};

function getInitials(name: string): string {
  return (name[0] ?? "S").toUpperCase();
}

export default function MarketplaceDetailClient({
  itemId,
}: MarketplaceDetailClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    category: "",
    imageUrl: "",
  });

  const load = useCallback(async () => {
    try {
      const data = await fetchMarketplaceItem(itemId);
      setItem(data);
      setEditForm({
        title: data.title,
        description: data.description,
        price: String(data.price),
        currency: data.currency,
        category: data.category,
        imageUrl: data.imageUrl ?? "",
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Listing data is warming up. Try again shortly.");
    }
  }, [itemId, router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  const parsed = useMemo(() => {
    if (!item) {
      return { body: "", tags: [] as string[] };
    }
    return parseTagsFromDescription(item.description);
  }, [item]);

  const images = useMemo(
    () => (item?.imageUrl ? [item.imageUrl] : []),
    [item?.imageUrl],
  );

  const status = item ? formatListingStatus(item.status) : "Available";

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;

    const price = Number(editForm.price);
    if (Number.isNaN(price) || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateListing(item.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        price,
        currency: editForm.currency.trim(),
        category: editForm.category.trim(),
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      setItem(updated);
      setShowEditModal(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update listing.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm("Delete this listing permanently?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteListing(item.id);
      router.push("/marketplace");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to delete listing.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="linkup-page">
        <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-6 aspect-[16/10] rounded-3xl bg-slate-200 dark:bg-white/10" />
          <div className="mt-6 h-8 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 h-6 w-1/4 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="linkup-page flex min-h-[50vh] items-center justify-center px-4">
        <div className="linkup-panel max-w-md p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error ?? "Listing not found."}
          </p>
          <Link href="/marketplace" className="linkup-btn-primary mt-4 inline-flex min-h-[44px]">
            Back to Market
          </Link>
        </div>
      </div>
    );
  }

  const tagList = [
    item.category,
    item.condition,
    item.location,
    ...parsed.tags,
  ].filter(Boolean) as string[];

  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Market
        </Link>

        <article className="linkup-panel overflow-hidden p-0">
          <MarketImageCarousel images={images} title={item.title} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                {item.category}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  status === "Sold"
                    ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {status}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
              {item.title}
            </h1>
            <p className="mt-3 text-3xl font-semibold text-brand-primary dark:text-brand-secondary">
              {formatPrice(item.price, item.currency)}
            </p>

            {tagList.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {tagList.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
              {parsed.body}
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-brand-dark/60">
              <p className="linkup-eyebrow">Seller</p>
              <div className="mt-3 flex items-center gap-3">
                {item.seller.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.seller.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-brand-primary/15"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                    {getInitials(item.seller.name)}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {item.seller.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    @{item.seller.username}
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="mt-6 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
                {notice}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {item.isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-5"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 text-sm font-semibold text-rose-700 dark:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setNotice("Checkout is getting ready. Message the seller to buy.")
                    }
                    className="linkup-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Buy
                  </button>
                  <Link
                    href={`/messages?userId=${item.seller.id}&listingId=${item.id}`}
                    className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-5"
                  >
                    <Mail className="h-4 w-4" />
                    Contact
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setNotice("Offers are getting ready. Contact the seller for now.")
                    }
                    className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-5"
                  >
                    <HandCoins className="h-4 w-4" />
                    Offer
                  </button>
                </>
              )}
            </div>

            <section className="mt-10 rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/50 p-6 dark:border-white/15 dark:bg-brand-dark/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Comments
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Listing comments are getting ready. Message the seller to ask
                questions about this item.
              </p>
            </section>
          </div>
        </article>
      </div>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Edit listing
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
                />
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
                >
                  {MARKET_CATEGORIES.filter((c) => c !== "All").map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <input
                value={editForm.imageUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, imageUrl: e.target.value })
                }
                placeholder="Image URL"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="linkup-btn-primary w-full min-h-[44px] disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
