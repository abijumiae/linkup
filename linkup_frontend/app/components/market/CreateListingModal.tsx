"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import MediaUploader from "@/src/components/MediaUploader";
import { UploadMediaType } from "@/src/lib/uploads";
import {
  appendTagsToDescription,
  MARKET_CATEGORIES,
} from "@/src/lib/marketConstants";
import { createListing, MarketplaceItem } from "@/src/lib/marketplace";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50";

type CreateListingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: MarketplaceItem) => void;
};

export default function CreateListingModal({
  isOpen,
  onClose,
  onCreated,
}: CreateListingModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    category: "Electronics",
    tags: "",
  });
  const [listingImages, setListingImages] = useState<
    { url: string; type: UploadMediaType }[]
  >([]);

  if (!isOpen) {
    return null;
  }

  async function handleCreate(event: FormEvent) {
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
        description: appendTagsToDescription(
          form.description.trim(),
          form.tags,
        ),
        price,
        currency: form.currency.trim() || "USD",
        category: form.category.trim(),
        imageUrl: listingImages[0]?.url,
      });

      onCreated(created);
      setForm({
        title: "",
        description: "",
        price: "",
        currency: "USD",
        category: "Electronics",
        tags: "",
      });
      setListingImages([]);
      onClose();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create listing.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="my-8 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="linkup-eyebrow">Market</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Create Listing
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Buy, sell, and trade within your community.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Title
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What are you listing?"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </span>
            <textarea
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              placeholder="Describe your item, service, or trade"
              className={`${inputClass} resize-none`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Price
              </span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Category
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {MARKET_CATEGORIES.filter((c) => c !== "All").map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tags
            </span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="vintage, local, negotiable"
              className={inputClass}
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Images
            </span>
            <MediaUploader
              label="Upload primary photo"
              accept="image"
              disabled={isCreating}
              value={listingImages[0] ?? null}
              onChange={(value) =>
                setListingImages(value ? [value] : [])
              }
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Additional gallery images coming soon. First image is used as the
              cover.
            </p>
          </div>

          {createError ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isCreating}
            className="linkup-btn-primary flex w-full min-h-[44px] items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Creating…" : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
