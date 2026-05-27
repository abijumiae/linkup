"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Heart,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createComment,
  FeedPost,
  fetchComments,
  formatAccountType,
  formatTimeAgo,
  toggleFollow,
  toggleLike,
} from "@/src/lib/posts";

type FeedComment = {
  id: string;
  content: string;
  author: string;
  time: string;
};

type CardPost = {
  id: string;
  authorId: string;
  author: string;
  role: string;
  time: string;
  content: string;
  liked: boolean;
  isFollowingAuthor: boolean;
  stats: { likes: number; comments: number; shares: number; saves: number };
  comments: FeedComment[];
  showComments: boolean;
  commentInput: string;
  interactionError: string | null;
};

function mapApiPost(post: FeedPost): CardPost {
  return {
    id: post.id,
    authorId: post.authorId,
    author: post.author.name,
    role: formatAccountType(post.author.accountType),
    time: formatTimeAgo(post.createdAt),
    content: post.content,
    liked: post.liked,
    isFollowingAuthor: post.isFollowingAuthor,
    stats: {
      likes: post.likeCount,
      comments: post.commentCount,
      shares: 0,
      saves: 0,
    },
    comments: [],
    showComments: false,
    commentInput: "",
    interactionError: null,
  };
}

type FeedPostCardProps = {
  post: FeedPost;
  currentUserId: string | null;
  sparkLabels?: boolean;
};

export default function FeedPostCard({
  post,
  currentUserId,
  sparkLabels = false,
}: FeedPostCardProps) {
  const [cardPost, setCardPost] = useState<CardPost>(() => mapApiPost(post));

  useEffect(() => {
    setCardPost(mapApiPost(post));
  }, [post]);

  function updateCard(updater: (current: CardPost) => CardPost) {
    setCardPost((current) => updater(current));
  }

  function getInteractionError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return "Please log in again to continue.";
      }
      return err.message;
    }
    return "Something went wrong. Please try again.";
  }

  async function handleLike() {
    updateCard((current) => ({ ...current, interactionError: null }));

    try {
      const result = await toggleLike(cardPost.id);
      updateCard((current) => ({
        ...current,
        liked: result.liked,
        stats: { ...current.stats, likes: result.likeCount },
      }));
    } catch (err) {
      updateCard((current) => ({
        ...current,
        interactionError: getInteractionError(err),
      }));
    }
  }

  async function handleToggleComments() {
    const nextShow = !cardPost.showComments;
    updateCard((current) => ({
      ...current,
      showComments: nextShow,
      interactionError: null,
    }));

    if (nextShow && cardPost.comments.length === 0) {
      try {
        const comments = await fetchComments(cardPost.id);
        updateCard((current) => ({
          ...current,
          comments: comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            author: comment.author.name,
            time: formatTimeAgo(comment.createdAt),
          })),
        }));
      } catch (err) {
        updateCard((current) => ({
          ...current,
          showComments: false,
          interactionError: getInteractionError(err),
        }));
      }
    }
  }

  async function handleSubmitComment() {
    const trimmed = cardPost.commentInput.trim();
    if (!trimmed) {
      return;
    }

    try {
      const created = await createComment(cardPost.id, trimmed);
      updateCard((current) => ({
        ...current,
        commentInput: "",
        showComments: true,
        stats: { ...current.stats, comments: current.stats.comments + 1 },
        comments: [
          ...current.comments,
          {
            id: created.id,
            content: created.content,
            author: created.author.name,
            time: formatTimeAgo(created.createdAt),
          },
        ],
      }));
    } catch (err) {
      updateCard((current) => ({
        ...current,
        interactionError: getInteractionError(err),
      }));
    }
  }

  async function handleFollow() {
    try {
      const result = await toggleFollow(cardPost.authorId);
      updateCard((current) => ({
        ...current,
        isFollowingAuthor: result.following,
        interactionError: null,
      }));
    } catch (err) {
      updateCard((current) => ({
        ...current,
        interactionError: getInteractionError(err),
      }));
    }
  }

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/10 transition hover:border-violet-500/20 hover:shadow-violet-500/10 dark:border-white/10 dark:bg-slate-900/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
            {cardPost.author[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{cardPost.author}</p>
            <p className="text-sm text-slate-500">
              {cardPost.role} · {cardPost.time}
            </p>
          </div>
        </div>
        {currentUserId && cardPost.authorId !== currentUserId ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages?userId=${cardPost.authorId}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-sky-400/30 dark:hover:bg-white/10"
            >
              <Mail className="h-4 w-4 text-sky-500 dark:text-sky-300" />
              Message
            </Link>
            <button
              type="button"
              onClick={() => void handleFollow()}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                cardPost.isFollowingAuthor
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:border-violet-400/30 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              {cardPost.isFollowingAuthor ? "Following" : "Follow"}
            </button>
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">{cardPost.content}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
        <button
          type="button"
          onClick={() => void handleLike()}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
            cardPost.liked
              ? "bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          <Heart
            className={`h-4 w-4 ${cardPost.liked ? "fill-pink-400 text-pink-400" : "text-pink-400"}`}
          />
          {sparkLabels ? (
            <>
              Boost
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {cardPost.stats.likes}
              </span>
            </>
          ) : (
            cardPost.stats.likes
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleToggleComments()}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
            cardPost.showComments
              ? "bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          <MessageCircle className="h-4 w-4 text-sky-500 dark:text-sky-300" />
          {sparkLabels ? (
            <>
              Reply
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {cardPost.stats.comments}
              </span>
            </>
          ) : (
            cardPost.stats.comments
          )}
        </button>
        <button className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
          <Share2 className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
          {cardPost.stats.shares}
        </button>
        <button className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
          <Bookmark className="h-4 w-4 text-violet-500 dark:text-violet-300" />
          {cardPost.stats.saves}
        </button>
      </div>
      {cardPost.interactionError ? (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{cardPost.interactionError}</p>
      ) : null}
      {cardPost.showComments ? (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
          {cardPost.comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/80">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{comment.author}</p>
              <p className="mt-1 text-xs text-slate-500">{comment.time}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
            </div>
          ))}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={cardPost.commentInput}
              onChange={(event) =>
                updateCard((current) => ({
                  ...current,
                  commentInput: event.target.value,
                }))
              }
              placeholder="Write a comment..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => void handleSubmitComment()}
              disabled={!cardPost.commentInput.trim()}
              className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
