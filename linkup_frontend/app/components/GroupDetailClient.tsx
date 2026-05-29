"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  createGroupPost,
  fetchGroup,
  fetchGroupPosts,
  GroupDetail,
  joinGroup,
  leaveGroup,
} from "@/src/lib/groups";
import { FeedPost } from "@/src/lib/posts";
import AuthLoadingScreen from "./AuthLoadingScreen";
import FeedPostCard from "./FeedPostCard";

type GroupDetailClientProps = {
  groupId: string;
};

export default function GroupDetailClient({ groupId }: GroupDetailClientProps) {
  const router = useRouter();
  const currentUserId = getCurrentUser()?.id ?? null;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postContent, setPostContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [groupData, postsData] = await Promise.all([
        fetchGroup(groupId),
        fetchGroupPosts(groupId),
      ]);
      setGroup(groupData);
      setPosts(postsData);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load hub. Please try again.");
    }
  }, [groupId, router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  const handleMembership = async () => {
    if (!group || group.isOwner) {
      return;
    }

    setMembershipLoading(true);
    try {
      const updated = group.isMember
        ? await leaveGroup(groupId)
        : await joinGroup(groupId);
      setGroup(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update membership.",
      );
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!group?.isMember || !postContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createGroupPost(groupId, postContent.trim());
      setPosts((prev) => [created, ...prev]);
      setPostContent("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to share a spark.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen message="Loading hub..." />;
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-brand-dark dark:text-slate-300">
        {error ?? "Hub not found."}
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/groups"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to hubs
        </Link>

        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-brand-dark/80">
          <p className="text-sm uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
            Hub
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {group.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {group.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>
              {group.membersCount}{" "}
              {group.membersCount === 1 ? "hub member" : "hub members"}
            </span>
            <span>·</span>
            <span>
              Host: {group.owner.name} (@{group.owner.username})
            </span>
          </div>
          <div className="mt-6">
            {group.isOwner ? (
              <span className="inline-flex rounded-full bg-brand-primary/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary dark:text-brand-secondary">
                You host this hub
              </span>
            ) : (
              <button
                type="button"
                disabled={membershipLoading}
                onClick={handleMembership}
                className="rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:opacity-50"
              >
                {membershipLoading
                  ? "Updating…"
                  : group.isMember
                    ? "Leave Hub"
                    : "Join Hub"}
              </button>
            )}
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        {group.isMember && (
          <form
            onSubmit={handleCreatePost}
            className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-brand-dark/80"
          >
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
              Share a spark in this hub
            </label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              placeholder="Share an idea, update, or opportunity with the hub…"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !postContent.trim()}
              className="mt-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:opacity-50"
            >
              {isSubmitting ? "Sharing…" : "Share spark"}
            </button>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Hub sparks
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-white/15 dark:bg-brand-dark/60">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No sparks in this hub yet.
                {group.isMember ? " Be the first to share something." : ""}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
