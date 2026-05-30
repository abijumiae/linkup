"use client";

import Link from "next/link";
import { MessageCirclePlus, X } from "lucide-react";

type NewChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
            <MessageCirclePlus className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2
          id="new-chat-title"
          className="mt-4 text-lg font-semibold text-slate-900 dark:text-white"
        >
          Start a new chat
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Start a new chat from Discover or a profile. Find someone you want to
          connect with and tap Message.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/explore"
            onClick={onClose}
            className="linkup-btn-primary min-h-[44px] flex-1 justify-center"
          >
            Go to Discover
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="linkup-btn-secondary min-h-[44px] flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
