"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Flag,
  Heart,
  Mail,
  MessageCircle,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
} from "lucide-react";
import { ApiError, resolveMediaUrl } from "@/src/lib/api";
import { Role } from "@/src/lib/auth";
import UserAvatar from "./UserAvatar";
import { PostMediaImage, PostMediaVideo } from "./PostMedia";
import {
  blockUser,
  fetchBlockStatus,
} from "@/src/lib/safety";
const EditPostModal = dynamic(() => import("./EditPostModal"), { ssr: false });
const DeletePostDialog = dynamic(() => import("./DeletePostDialog"), {
  ssr: false,
});
const ReportModal = dynamic(() => import("./ReportModal"), { ssr: false });
const CommentsDrawer = dynamic(() => import("./CommentsDrawer"), {
  ssr: false,
});
import {
  FeedPost,
  deletePost,
  fetchPostReactions,
  formatAccountType,
  formatTimeAgo,
  toggleFollow,
  toggleLike,
  togglePostReaction,
  toggleSave,
} from "@/src/lib/posts";
import {
  emptyReactionSummaries,
  type LinkupReactionEmoji,
  type ReactionSummary,
} from "@/src/lib/reactions";
import { ChipActionButton } from "@/app/components/buttons/LinkupButtons";
import ReactionBar from "./ReactionBar";
import OnlineStatusDot from "./OnlineStatusDot";

function isModeratorRole(role: Role | null | undefined): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}

type FeedPostCardProps = {
  post: FeedPost;
  currentUserId: string | null;
  currentUserRole?: Role | null;
  sparkLabels?: boolean;
  pulseLabels?: boolean;
  onPostUpdated?: (post: FeedPost) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUnsaved?: (postId: string) => void;
};

function FeedPostCard({
  post,
  currentUserId,
  currentUserRole = null,
  sparkLabels = false,
  pulseLabels = false,
  onPostUpdated,
  onPostDeleted,
  onPostUnsaved,
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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionSummary[]>(
    emptyReactionSummaries(),
  );
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = Boolean(currentUserId && localPost.authorId === currentUserId);
  const canEdit = isOwner;
  const canDelete = isOwner || isModeratorRole(currentUserRole);
  const canReport = Boolean(currentUserId && !isOwner);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  useEffect(() => {
    if (!localPost.id || localPost.id.startsWith("static-")) {
      return;
    }

    let cancelled = false;
    setReactionsLoading(true);

    void fetchPostReactions(localPost.id)
      .then((data) => {
        if (!cancelled) {
          setReactions(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReactions(emptyReactionSummaries());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReactionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localPost.id]);

  useEffect(() => {
    if (
      (!menuOpen && !reportOpen) ||
      !currentUserId ||
      localPost.authorId === currentUserId
    ) {
      return;
    }

    void fetchBlockStatus(localPost.authorId)
      .then((status) => setBlockedByMe(status.blockedByMe))
      .catch(() => undefined);
  }, [menuOpen, reportOpen, currentUserId, localPost.authorId]);

  useEffect(() => {
    setLiked(localPost.liked);
    setSaved(localPost.saved ?? false);
    setLikeCount(localPost.likeCount);
    setCommentCount(localPost.commentCount);
    setIsFollowingAuthor(localPost.isFollowingAuthor);
  }, [localPost]);

  const imageSrc = resolveMediaUrl(localPost.imageUrl);
  const videoSrc = resolveMediaUrl(localPost.videoUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoSrc]);

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
      const result = await toggleLike(localPost.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleSave() {
    setInteractionError(null);
    try {
      const result = await toggleSave(localPost.id);
      setSaved(result.saved);
      if (!result.saved) {
        onPostUnsaved?.(localPost.id);
      }
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleShare() {
    setShareNotice(null);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/explore?q=${encodeURIComponent(localPost.content.slice(0, 80))}`
        : "https://www.thelinkupzone.com/explore";

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${localPost.author.name} on LinkUp`,
          text: localPost.content.slice(0, 140),
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
      const result = await toggleFollow(localPost.authorId);
      setIsFollowingAuthor(result.following);
      setInteractionError(null);
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  async function handleBlockAuthor() {
    setMenuOpen(false);
    try {
      await blockUser(localPost.authorId);
      setBlockedByMe(true);
      setShareNotice("You blocked this user.");
    } catch (err) {
      setInteractionError(getInteractionError(err));
    }
  }

  function handlePostUpdated(updated: FeedPost) {
    setLocalPost(updated);
    onPostUpdated?.(updated);
    setShareNotice("Post updated.");
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    setInteractionError(null);

    try {
      await deletePost(localPost.id);
      setDeleteOpen(false);
      setShareNotice("Post deleted.");
      onPostDeleted?.(localPost.id);
    } catch (err) {
      setInteractionError(
        err instanceof ApiError
          ? err.message
          : "Could not delete post. Please try again.",
      );
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {editOpen ? (
        <EditPostModal
          open={editOpen}
          post={localPost}
          onClose={() => setEditOpen(false)}
          onUpdated={handlePostUpdated}
        />
      ) : null}
      {deleteOpen ? (
        <DeletePostDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      ) : null}
      {reportOpen ? (
        <ReportModal
          open={reportOpen}
          targetType="POST"
          targetId={localPost.id}
          targetLabel="Report spark"
          onClose={() => setReportOpen(false)}
          onSubmitted={() => setShareNotice("Thanks. Your report has been sent.")}
        />
      ) : null}
      <article className="linkup-card p-5 transition hover:border-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <UserAvatar
                src={localPost.author.avatarUrl}
                name={localPost.author.name}
                username={localPost.author.username}
                size="lg"
                ringClassName="ring-2 ring-brand-primary/20"
              />
              {localPost.authorId !== currentUserId ? (
                <OnlineStatusDot userId={localPost.authorId} />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {localPost.author.name}
              </p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                @{localPost.author.username} · {formatAccountType(localPost.author.accountType)} ·{" "}
                {formatTimeAgo(localPost.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentUserId && localPost.authorId !== currentUserId ? (
              <>
                <Link
                  href={`/messages?userId=${localPost.authorId}`}
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
                <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-brand-dark">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit post
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete post
                    </button>
                  ) : null}
                  {canReport ? (
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
                  ) : null}
                  {currentUserId && localPost.authorId !== currentUserId ? (
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

        {localPost.content ? (
          <p className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {localPost.content}
          </p>
        ) : null}

        {imageSrc ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-black/5 dark:border-slate-800 dark:bg-black/30">
            <PostMediaImage
              src={imageSrc}
              className="bg-slate-100 dark:bg-brand-dark/60"
            />
          </div>
        ) : null}

        {videoSrc ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-black/5 dark:border-slate-800 dark:bg-black/30">
            <PostMediaVideo
              videoRef={videoRef}
              src={videoSrc}
              className="bg-slate-100 dark:bg-brand-dark/60"
            />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 text-sm dark:border-white/10 sm:gap-3">
          <ChipActionButton
            icon={Heart}
            pink
            active={liked}
            onClick={() => void handleLike()}
            aria-label={useSparkWording ? "Boost spark" : "Like post"}
            title="Boost"
          >
            {useSparkWording ? (
              <>
                Boost <span className="tabular-nums">{likeCount}</span>
              </>
            ) : (
              likeCount
            )}
          </ChipActionButton>

          <ChipActionButton
            icon={MessageCircle}
            onClick={() => setCommentsOpen(true)}
            aria-label="Open comments"
            title="Reply"
          >
            {useSparkWording ? (
              <>
                Reply <span className="tabular-nums">{commentCount}</span>
              </>
            ) : (
              commentCount
            )}
          </ChipActionButton>

          <ChipActionButton
            icon={Share2}
            onClick={() => void handleShare()}
            aria-label="Share post"
            title="Share"
          >
            Share
          </ChipActionButton>

          <ChipActionButton
            icon={Repeat2}
            disabled
            title="Reshare coming soon"
            aria-label="Reshare (coming soon)"
            className="cursor-not-allowed opacity-70"
          >
            Reshare
          </ChipActionButton>

          <ChipActionButton
            icon={Bookmark}
            active={saved}
            onClick={() => void handleSave()}
            aria-label={saved ? "Unsave post" : "Save post"}
            title="Save"
            className={
              saved
                ? "[&_svg]:fill-brand-primary dark:[&_svg]:fill-brand-secondary"
                : ""
            }
          >
            {useSparkWording ? "Save" : saved ? "Saved" : "Save"}
          </ChipActionButton>
        </div>

        {currentUserId ? (
          <div className="mt-3 border-t border-slate-200/60 pt-3 dark:border-white/10">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {useSparkWording ? "React to Spark" : "Reactions"}
            </p>
            <ReactionBar
              reactions={reactions}
              loading={reactionsLoading}
              compact
              onToggle={async (emoji: LinkupReactionEmoji) => {
                const result = await togglePostReaction(localPost.id, emoji);
                setReactions(result.reactions);
                return result.reactions;
              }}
            />
          </div>
        ) : null}

        {interactionError ? (
          <p className="mt-3 text-sm text-red-500 dark:text-red-400">{interactionError}</p>
        ) : null}
        {shareNotice ? (
          <p className="mt-3 text-sm text-brand-primary dark:text-brand-secondary">{shareNotice}</p>
        ) : null}
      </article>

      {commentsOpen ? (
        <CommentsDrawer
          open={commentsOpen}
          postId={localPost.id}
          currentUserId={currentUserId}
          initialCount={commentCount}
          pulseLabels={useSparkWording}
          onClose={() => setCommentsOpen(false)}
          onCountChange={setCommentCount}
          postIdForDelete={localPost.id}
        />
      ) : null}
    </>
  );
}

export default memo(FeedPostCard);
