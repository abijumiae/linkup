"use client";

import { FormEvent, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { GroupDetail, updateGroup } from "@/src/lib/groups";

type GroupHubSettingsProps = {
  group: GroupDetail;
  onGroupUpdated: (group: GroupDetail) => void;
};

export default function GroupHubSettings({
  group,
  onGroupUpdated,
}: GroupHubSettingsProps) {
  const canEdit = group.isOwner || group.role === "ADMIN";
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [coverImage, setCoverImage] = useState(group.coverImage ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!canEdit) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage.trim() || null,
      });
      onGroupUpdated(updated);
      setNotice("Hub settings saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save hub settings.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="linkup-card linkup-card-enter mb-8 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Hub Settings
        </h2>
      </div>

      {error ? (
        <p className="linkup-alert-error linkup-alert-enter mb-4" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="linkup-alert-success linkup-alert-enter mb-4" role="status">
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Hub name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cover image URL
          </span>
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
            placeholder="https://..."
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="linkup-btn-primary min-h-[44px]"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Hub Settings"
          )}
        </button>
      </form>
    </section>
  );
}
