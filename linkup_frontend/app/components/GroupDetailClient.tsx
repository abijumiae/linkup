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
      setError("Unable to load group. Please try again.");
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
        err instanceof ApiError ? err.message : "Unable to create post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        {error ?? "Group not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/groups"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to groups
        </Link>

        <header className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
            Group
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{group.name}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {group.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span>
              {group.membersCount}{" "}
              {group.membersCount === 1 ? "member" : "members"}
            </span>
            <span>·</span>
            <span>
              Owner: {group.owner.name} (@{group.owner.username})
            </span>
          </div>
          <div className="mt-6">
            {group.isOwner ? (
              <span className="inline-flex rounded-full bg-violet-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                You own this group
              </span>
            ) : (
              <button
                type="button"
                disabled={membershipLoading}
                onClick={handleMembership}
                className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
              >
                {membershipLoading
                  ? "Updating…"
                  : group.isMember
                    ? "Leave group"
                    : "Join group"}
              </button>
            )}
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {group.isMember && (
          <form
            onSubmit={handleCreatePost}
            className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-lg backdrop-blur-xl"
          >
            <label className="mb-2 block text-sm text-slate-400">
              Post to this group
            </label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              placeholder="Share something with the group…"
              className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400/50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !postContent.trim()}
              className="mt-4 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
            >
              {isSubmitting ? "Posting…" : "Post"}
            </button>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Group posts</h2>
          {posts.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-400">
              No posts in this group yet.
              {group.isMember ? " Be the first to share something." : ""}
            </p>
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
