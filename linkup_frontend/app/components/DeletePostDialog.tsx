"use client";

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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
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
        aria-labelledby="delete-post-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-brand-dark"
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="linkup-btn-secondary min-h-[44px] flex-1 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
