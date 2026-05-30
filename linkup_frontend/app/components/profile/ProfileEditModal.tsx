"use client";

import { X } from "lucide-react";
import ProfileEditForm from "../ProfileEditForm";
import { ProfileUser, UpdateProfilePayload } from "@/src/lib/users";

type ProfileEditModalProps = {
  user: ProfileUser;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateProfilePayload) => Promise<void>;
};

export default function ProfileEditModal({
  user,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: ProfileEditModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close edit profile"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/90 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-brand-dark/95">
          <div>
            <p className="linkup-eyebrow">Edit profile</p>
            <h2
              id="edit-profile-title"
              className="mt-1 text-lg font-semibold text-slate-900 dark:text-white"
            >
              Update your LinkUp Card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <ProfileEditForm
            user={user}
            isSaving={isSaving}
            onCancel={onClose}
            onSubmit={onSubmit}
            variant="modal"
          />
        </div>
      </div>
    </div>
  );
}
