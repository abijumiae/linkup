"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const dialog = (
    <div
      className="linkup-modal-overlay z-[9999] !items-end sm:!items-center"
      role="presentation"
      onClick={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        className="linkup-modal-panel max-w-sm rounded-t-3xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
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

  return createPortal(dialog, document.body);
}
