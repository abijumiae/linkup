"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Pencil, ShoppingBag, Trash2, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  deleteListing,
  fetchMarketplaceItem,
  formatPrice,
  MarketplaceItem,
  updateListing,
} from "@/src/lib/marketplace";
import { marketplaceCategories } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";

type MarketplaceDetailClientProps = {
  itemId: string;
};

export default function MarketplaceDetailClient({
  itemId,
}: MarketplaceDetailClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    category: "",
    condition: "",
    location: "",
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
        condition: data.condition ?? "",
        location: data.location ?? "",
        imageUrl: data.imageUrl ?? "",
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load listing. Please try again.");
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
        condition: editForm.condition.trim() || undefined,
        location: editForm.location.trim() || undefined,
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
    return <AuthLoadingScreen />;
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {error ?? "Listing not found."}
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to market
        </Link>

        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-violet-500/20 via-slate-900 to-slate-950">
              <ShoppingBag className="h-16 w-16 text-violet-300/50" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
              {item.category}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              {item.title}
            </h1>
            <p className="mt-4 text-2xl font-semibold text-violet-700 dark:text-violet-200">
              {formatPrice(item.price, item.currency)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
              {item.condition && (
                <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-white/10">
                  {item.condition}
                </span>
              )}
              {item.location && (
                <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-white/10">
                  {item.location}
                </span>
              )}
            </div>

            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
              {item.description}
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Seller
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {item.seller.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">@{item.seller.username}</p>
            </div>

            {error && (
              <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {item.isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              ) : (
                <Link
                  href={`/messages?userId=${item.seller.id}&listingId=${item.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
                >
                  <Mail className="h-4 w-4" />
                  Message Seller
                </Link>
              )}
            </div>
          </div>
        </article>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Edit listing</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
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
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                />
                <input
                  value={editForm.currency}
                  onChange={(e) =>
                    setEditForm({ ...editForm, currency: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                />
              </div>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-violet-400/50"
              >
                {marketplaceCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                value={editForm.condition}
                onChange={(e) =>
                  setEditForm({ ...editForm, condition: e.target.value })
                }
                placeholder="Condition"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <input
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                placeholder="Location"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <input
                value={editForm.imageUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, imageUrl: e.target.value })
                }
                placeholder="Image URL"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
