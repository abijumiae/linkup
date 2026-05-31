"use client";

import { useEffect } from "react";

type DeletePostDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
};

export default function DeletePostDialog({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeletePostDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isDeleting, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={() => {
          if (!isDeleting) {
            onClose();
          }
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:p-6"
      >
        <h2
          id="delete-post-title"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          Delete this Spark?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="linkup-btn-secondary min-h-[44px] w-full sm:w-auto sm:min-w-[7rem] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60 sm:w-auto sm:min-w-[7rem]"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
