"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, Loader2, Trash2, UserRoundCog } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  archiveGroup,
  GroupDetail,
  leaveGroup,
  permanentlyDeleteGroup,
  transferGroupOwnership,
} from "@/src/lib/groups";
import { HubAdminMember } from "@/src/lib/hubAdmins";

type GroupDangerZoneProps = {
  group: GroupDetail;
  transferCandidates: HubAdminMember[];
  onGroupUpdated: (group: GroupDetail) => void;
};

export default function GroupDangerZone({
  group,
  transferCandidates,
  onGroupUpdated,
}: GroupDangerZoneProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");

  const isOwner = group.isOwner;
  const isArchived = Boolean(group.archivedAt);

  async function handleLeave() {
    setBusy("leave");
    setError(null);
    try {
      await leaveGroup(group.id);
      router.push("/groups");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not leave this hub.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleTransfer(event: FormEvent) {
    event.preventDefault();
    if (!transferTargetId) return;
    setBusy("transfer");
    setError(null);
    try {
      const updated = await transferGroupOwnership(group.id, transferTargetId);
      setNotice("Ownership transferred successfully.");
      onGroupUpdated(updated);
      router.push("/groups");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not transfer ownership.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive() {
    if (
      !window.confirm(
        "Archive this hub? It will be hidden from the public hub list.",
      )
    ) {
      return;
    }
    setBusy("archive");
    setError(null);
    try {
      const updated = await archiveGroup(group.id);
      setNotice("Hub archived.");
      onGroupUpdated(updated);
      router.push("/groups");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not archive hub.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePermanentDelete(event: FormEvent) {
    event.preventDefault();
    setBusy("delete");
    setError(null);
    try {
      await permanentlyDeleteGroup(group.id, confirmName, password);
      setShowDeleteModal(false);
      router.push("/groups");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not delete hub permanently.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="linkup-card linkup-card-enter mb-8 border-rose-500/25 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Hub Settings · Danger Zone
        </h2>
      </div>
      <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
        Manage membership, ownership, archiving, or permanent deletion. Only the
        hub host can archive or permanently delete this hub.
      </p>

      {error ? (
        <p
          className="linkup-alert-error linkup-alert-enter mb-4"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="linkup-alert-success linkup-alert-enter mb-4" role="status">
          {notice}
        </p>
      ) : null}

      <div className="space-y-4">
        {!isOwner && group.isMember ? (
          <div className="rounded-2xl border border-slate-200/90 p-4 dark:border-white/10">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Leave hub
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Stop receiving hub updates and remove yourself from the member
              list.
            </p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleLeave()}
              className="linkup-btn-secondary mt-3"
            >
              {busy === "leave" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Leaving…
                </>
              ) : (
                "Leave Hub"
              )}
            </button>
          </div>
        ) : null}

        {isOwner ? (
          <>
            <form
              onSubmit={handleTransfer}
              className="rounded-2xl border border-slate-200/90 p-4 dark:border-white/10"
            >
              <div className="flex items-center gap-2">
                <UserRoundCog className="h-4 w-4 text-brand-primary" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Transfer ownership
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Required before leaving if you do not want to delete the hub.
              </p>
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
                disabled={busy !== null || transferCandidates.length === 0}
              >
                <option value="">Select an admin or moderator</option>
                {transferCandidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name} (@{member.user.username}) · {member.role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy !== null || !transferTargetId}
                className="linkup-btn-secondary mt-3"
              >
                {busy === "transfer" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transferring…
                  </>
                ) : (
                  "Transfer Ownership"
                )}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200/90 p-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Archive hub
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Hide this hub from public listings without deleting its data.
              </p>
              <button
                type="button"
                disabled={busy !== null || isArchived}
                onClick={() => void handleArchive()}
                className="linkup-btn-secondary mt-3"
              >
                {busy === "archive" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Archiving…
                  </>
                ) : isArchived ? (
                  "Already archived"
                ) : (
                  "Archive Hub"
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-500" />
                <p className="text-sm font-medium text-rose-700 dark:text-rose-200">
                  Delete hub permanently
                </p>
              </div>
              <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-200/90">
                This action is permanent and cannot be undone. All group data
                will be deleted, including posts, comments, likes, media, chats,
                members, and notifications.
              </p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setShowDeleteModal(true);
                  setConfirmName("");
                  setPassword("");
                  setError(null);
                }}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 active:scale-[0.98] dark:text-rose-200"
              >
                Delete Group Permanently
              </button>
            </div>
          </>
        ) : null}
      </div>

      {showDeleteModal ? (
        <div className="linkup-modal-overlay" role="dialog" aria-modal="true">
          <form
            onSubmit={handlePermanentDelete}
            className="linkup-modal-panel max-w-md space-y-4"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Confirm permanent deletion
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Type <strong>{group.name}</strong> and enter your password to
              confirm.
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Hub name
              </span>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark/80 dark:text-white"
                required
                autoComplete="current-password"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="linkup-btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={busy === "delete"}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  busy === "delete" ||
                  confirmName.trim() !== group.name.trim() ||
                  !password
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "delete" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete permanently"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
