"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  Comment,
  createComment,
  deleteComment,
  fetchComments,
  formatTimeAgo,
} from "@/src/lib/posts";

type CommentsDrawerProps = {
  open: boolean;
  postId: string;
  currentUserId: string | null;
  initialCount: number;
  pulseLabels?: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

export default function CommentsDrawer({
  open,
  postId,
  currentUserId,
  initialCount,
  pulseLabels = false,
  onClose,
  onCountChange,
}: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    setError(null);

    fetchComments(postId)
      .then((items) => {
        setComments(items);
        setCount(items.length);
        onCountChange?.(items.length);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Could not load comments.",
        );
      })
      .finally(() => setLoading(false));
  }, [open, postId, onCountChange]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createComment(postId, trimmed);
      setComments((current) => [...current, created]);
      setInput("");
      const nextCount = count + 1;
      setCount(nextCount);
      onCountChange?.(nextCount);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not post comment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const result = await deleteComment(commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
      setCount(result.commentCount);
      onCountChange?.(result.commentCount);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete comment.",
      );
    }
  }

  if (!open) {
    return null;
  }

  const label = pulseLabels ? "Replies" : "Comments";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0 bg-brand-dark/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <p className="linkup-eyebrow">{label}</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {count} {count === 1 ? label.slice(0, -1) : label.toLowerCase()}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
                />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="linkup-empty py-10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No {label.toLowerCase()} yet. Start the conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {comment.author.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{comment.author.username} ·{" "}
                        {formatTimeAgo(comment.createdAt)}
                      </p>
                    </div>
                    {currentUserId === comment.authorId ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment.id)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="border-t border-slate-200 p-4 dark:border-white/10"
        >
          {error ? (
            <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                pulseLabels ? "Write a reply..." : "Write a comment..."
              }
              className="min-h-[44px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className="linkup-btn-primary min-h-[44px] disabled:opacity-50"
            >
              {submitting ? "Posting..." : pulseLabels ? "Reply" : "Comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
