"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import {
  Bookmark,
  Flag,
  Heart,
  Mail,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { ApiError, resolveMediaUrl } from "@/src/lib/api";
import { resolveProfileImageUrl } from "@/src/lib/profileMedia";
import {
  blockUser,
  fetchBlockStatus,
} from "@/src/lib/safety";
import ReportModal from "./ReportModal";
import {
  FeedPost,
  formatAccountType,
  formatTimeAgo,
  toggleFollow,
  toggleLike,
  toggleSave,
} from "@/src/lib/posts";
import BoostReactionHints from "./linkup/BoostReactionHints";
import CommentsDrawer from "./CommentsDrawer";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

type FeedPostCardProps = {
  post: FeedPost;
  currentUserId: string | null;
  sparkLabels?: boolean;
  pulseLabels?: boolean;
};

function FeedPostCard({
  post,
  currentUserId,
  sparkLabels = false,
  pulseLabels = false,
}: FeedPostCardProps) {
  const useSparkWording = sparkLabels || pulseLabels;
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(
    post.isFollowingAuthor,
  );
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId || post.authorId === currentUserId) {
      return;
    }

    void fetchBlockStatus(post.authorId)
      .then((status) => setBlockedByMe(status.blockedByMe))
      .catch(() => undefined);
  }, [currentUserId, post.authorId]);

  useEffect(() => {
    setLiked(post.liked);
    setSaved(post.saved ?? false);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
    setIsFollowingAuthor(post.isFollowingAuthor);
  }, [post]);

  const imageSrc = resolveMediaUrl(post.imageUrl);
  const videoSrc = resolveMediaUrl(post.videoUrl);
  const avatarSrc = resolveProfileImageUrl(post.author.avatarUrl);

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
    setInteractionError(null);
    try {
      const result = await toggleLike(post.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleSave() {
    setInteractionError(null);
    try {
      const result = await toggleSave(post.id);
      setSaved(result.saved);
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleShare() {
    setShareNotice(null);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/explore?q=${encodeURIComponent(post.content.slice(0, 80))}`
        : "https://www.thelinkupzone.com/explore";

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.author.name} on LinkUp`,
          text: post.content.slice(0, 140),
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareNotice("Link copied to clipboard");
      }
    } catch {
      setShareNotice("Share unavailable right now");
    }
  }

  async function handleFollow() {
    try {
      const result = await toggleFollow(post.authorId);
      setIsFollowingAuthor(result.following);
      setInteractionError(null);
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleBlockAuthor() {
    setMenuOpen(false);
    try {
      await blockUser(post.authorId);
      setBlockedByMe(true);
      setShareNotice("You blocked this user.");
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  return (
    <>
      <ReportModal
        open={reportOpen}
        targetType="POST"
        targetId={post.id}
        targetLabel="Report spark"
        onClose={() => setReportOpen(false)}
        onSubmitted={() => setShareNotice("Thanks. Your report has been sent.")}
      />
      <article className="linkup-card p-5 transition hover:border-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-brand-primary/20"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/20">
                {getInitials(post.author.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {post.author.name}
              </p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                @{post.author.username} · {formatAccountType(post.author.accountType)} ·{" "}
                {formatTimeAgo(post.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentUserId && post.authorId !== currentUserId ? (
              <>
                <Link
                  href={`/messages?userId=${post.authorId}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  <Mail className="h-4 w-4 text-brand-secondary" />
                  {pulseLabels ? "Start Chat" : "Message"}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleFollow()}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm transition ${
                    isFollowingAuthor
                      ? "border-brand-primary/40 bg-brand-primary/15 text-brand-primary dark:text-brand-secondary"
                      : "border-slate-200 bg-slate-100 text-slate-700 hover:border-brand-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {isFollowingAuthor
                    ? pulseLabels
                      ? "Connected"
                      : "Following"
                    : pulseLabels
                      ? "Connect"
                      : "Follow"}
                </button>
              </>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"
                aria-label="Post options"
              >
                ···
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-brand-dark">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Flag className="h-4 w-4" />
                    Report post
                  </button>
                  {currentUserId && post.authorId !== currentUserId ? (
                    <button
                      type="button"
                      onClick={() => void handleBlockAuthor()}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      {blockedByMe ? "Blocked" : "Block user"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {post.content ? (
          <p className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {post.content}
          </p>
        ) : null}

        {imageSrc ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              loading="lazy"
              className="max-h-[28rem] w-full object-contain bg-slate-100 dark:bg-brand-dark/60"
            />
          </div>
        ) : null}

        {videoSrc ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <video
              src={videoSrc}
              controls
              className="max-h-[28rem] w-full bg-slate-100 dark:bg-brand-dark/60"
            />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400 sm:gap-3">
          <button
            type="button"
            onClick={() => void handleLike()}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-3.5 py-2.5 transition active:scale-[0.97] ${
              liked
                ? "bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-pink-400 text-pink-400" : "text-pink-400"}`} />
            {useSparkWording ? (
              <>
                Boost
                <span className="tabular-nums">{likeCount}</span>
              </>
            ) : (
              likeCount
            )}
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-700 transition hover:bg-slate-200 active:scale-[0.97] dark:bg-white/5 dark:text-slate-300"
          >
            <MessageCircle className="h-4 w-4 text-brand-secondary" />
            {useSparkWording ? (
              <>
                Reply
                <span className="tabular-nums">{commentCount}</span>
              </>
            ) : (
              commentCount
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-700 transition hover:bg-slate-200 active:scale-[0.97] dark:bg-white/5 dark:text-slate-300"
          >
            <Share2 className="h-4 w-4 text-brand-secondary" />
            Share
          </button>

          <button
            type="button"
            disabled
            title="Reshare coming soon"
            className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-full bg-slate-100/70 px-3.5 py-2.5 text-slate-500 opacity-70 dark:bg-white/5 dark:text-slate-500"
          >
            <Repeat2 className="h-4 w-4" />
            Reshare
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-3.5 py-2.5 transition active:scale-[0.97] ${
              saved
                ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-secondary/15 dark:text-brand-secondary"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-brand-primary dark:fill-brand-secondary" : ""}`} />
            {useSparkWording ? "Save" : saved ? "Saved" : "Save"}
          </button>
        </div>

        {useSparkWording ? <BoostReactionHints /> : null}

        {interactionError ? (
          <p className="mt-3 text-sm text-red-500 dark:text-red-400">{interactionError}</p>
        ) : null}
        {shareNotice ? (
          <p className="mt-3 text-sm text-brand-primary dark:text-brand-secondary">{shareNotice}</p>
        ) : null}
      </article>

      <CommentsDrawer
        open={commentsOpen}
        postId={post.id}
        currentUserId={currentUserId}
        initialCount={commentCount}
        pulseLabels={useSparkWording}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
        postIdForDelete={post.id}
      />
    </>
  );
}

export default memo(FeedPostCard);
