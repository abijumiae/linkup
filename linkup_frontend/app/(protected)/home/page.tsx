"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Mail,
  PlusCircle,
  Share2,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
  homeFeedTabs,
  homeOnlineFriends,
  homePosts,
  homeStories,
  homeSuggestions,
  homeStats,
  homeTrendingTopics,
} from "../../data/linkupData";
import { ApiError } from "../../../src/lib/api";
import { getCurrentUser } from "../../../src/lib/auth";
import {
  createComment,
  createPost,
  fetchComments,
  fetchFeed,
  FeedPost as ApiFeedPost,
  formatAccountType,
  formatTimeAgo,
  toggleFollow,
  toggleLike,
} from "../../../src/lib/posts";

type FeedComment = {
  id: string;
  content: string;
  author: string;
  time: string;
};

type FeedPost = {
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
  isStatic: boolean;
};

function mapPostToFeedPost(post: ApiFeedPost): FeedPost {
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
    isStatic: false,
  };
}

function mapStaticPosts(): FeedPost[] {
  return homePosts.map((post, index) => ({
    id: `static-${index}`,
    authorId: `static-author-${index}`,
    author: post.author,
    role: post.role,
    time: post.time,
    content: post.content,
    liked: false,
    isFollowingAuthor: false,
    stats: post.stats,
    comments: [],
    showComments: false,
    commentInput: "",
    interactionError: null,
    isStatic: true,
  }));
}

export default function HomeDashboardPage() {
  const currentUserId = getCurrentUser()?.id ?? null;
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>(mapStaticPosts());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePost(postId: string, updater: (post: FeedPost) => FeedPost) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? updater(post) : post)),
    );
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

  async function handleLike(postId: string) {
    const post = posts.find((item) => item.id === postId);
    if (!post || post.isStatic) {
      return;
    }

    updatePost(postId, (current) => ({
      ...current,
      interactionError: null,
    }));

    try {
      const result = await toggleLike(postId);
      updatePost(postId, (current) => ({
        ...current,
        liked: result.liked,
        stats: { ...current.stats, likes: result.likeCount },
      }));
    } catch (err) {
      updatePost(postId, (current) => ({
        ...current,
        interactionError: getInteractionError(err),
      }));
    }
  }

  async function handleToggleComments(postId: string) {
    const post = posts.find((item) => item.id === postId);
    if (!post || post.isStatic) {
      return;
    }

    const nextShowComments = !post.showComments;
    updatePost(postId, (current) => ({
      ...current,
      showComments: nextShowComments,
      interactionError: null,
    }));

    if (nextShowComments && post.comments.length === 0) {
      try {
        const comments = await fetchComments(postId);
        updatePost(postId, (current) => ({
          ...current,
          comments: comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            author: comment.author.name,
            time: formatTimeAgo(comment.createdAt),
          })),
        }));
      } catch (err) {
        updatePost(postId, (current) => ({
          ...current,
          showComments: false,
          interactionError: getInteractionError(err),
        }));
      }
    }
  }

  async function handleSubmitComment(postId: string) {
    const post = posts.find((item) => item.id === postId);
    if (!post || post.isStatic) {
      return;
    }

    const trimmed = post.commentInput.trim();
    if (!trimmed) {
      return;
    }

    updatePost(postId, (current) => ({
      ...current,
      interactionError: null,
    }));

    try {
      const created = await createComment(postId, trimmed);
      updatePost(postId, (current) => ({
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
      updatePost(postId, (current) => ({
        ...current,
        interactionError: getInteractionError(err),
      }));
    }
  }

  async function handleFollow(authorId: string) {
    if (authorId.startsWith("static-")) {
      return;
    }

    try {
      const result = await toggleFollow(authorId);
      setPosts((current) =>
        current.map((post) =>
          post.authorId === authorId
            ? { ...post, isFollowingAuthor: result.following, interactionError: null }
            : post,
        ),
      );
    } catch (err) {
      setPosts((current) =>
        current.map((post) =>
          post.authorId === authorId
            ? { ...post, interactionError: getInteractionError(err) }
            : post,
        ),
      );
    }
  }

  useEffect(() => {
    fetchFeed()
      .then((data) => {
        if (data.length > 0) {
          setPosts(data.map(mapPostToFeedPost));
        }
      })
      .catch(() => {
        // Keep static demo posts when feed cannot be loaded.
      });
  }, []);

  async function handleCreatePost() {
    const trimmed = postContent.trim();

    if (!trimmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createPost({ content: trimmed });
      setPostContent("");
      setPosts((current) => [
        {
          ...mapPostToFeedPost({
            ...created,
            likeCount: 0,
            commentCount: 0,
            liked: false,
            isFollowingAuthor: false,
          }),
        },
        ...current,
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                  <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-cyan-300/5 p-5 dark:from-violet-500/20 dark:via-sky-500/10 dark:to-cyan-300/10">
                    <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-200">LinkUp</p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Connect Everything</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Welcome back, Sam. Your feed is ready to explore with your premium communities and latest updates.
                    </p>
                  </div>
                  <div className="rounded-[2rem] bg-slate-50 p-5 dark:bg-slate-950/80">
                    <div className="flex items-center gap-4 rounded-[2rem] bg-white p-4 dark:bg-slate-900/80">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/15 text-lg font-semibold text-violet-600 dark:text-violet-300">S</div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Sam Wilder</p>
                        <p className="text-sm text-slate-600 dark:text-slate-500">Product Strategy</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/70">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workspace</p>
                  <div className="mt-4 grid gap-3">
                    {homeStats.map((stat) => (
                      <div key={stat.label} className="rounded-3xl bg-white p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Daily digest</p>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Your social workspace is ready</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    All your communities, messages, and updates are accessible from the left navigation. Keep your focus on the feed and launch premium conversations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:border-violet-400/40 dark:hover:bg-white/10">
                    Latest updates
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={!postContent.trim() || isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    New post
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Create post</p>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Share what you're building</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? "Posting..." : "New Post"}
                </button>
              </div>
              <textarea
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                className="mt-5 min-h-[120px] w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Share an update with your community..."
              />
              {error ? (
                <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 dark:border-transparent dark:bg-white/5 dark:text-slate-300">#Product</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 dark:border-transparent dark:bg-white/5 dark:text-slate-300">#Design</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 dark:border-transparent dark:bg-white/5 dark:text-slate-300">#Community</span>
              </div>
            </section>

            <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Stories</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Trending now</h2>
                </div>
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-white/5">
                  See all
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {homeStories.map((story) => (
                  <div key={story.name} className="rounded-[2rem] border border-slate-200 bg-white p-4 text-sm shadow-lg transition hover:border-violet-500/20 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-slate-950/10 dark:hover:shadow-violet-500/10">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-600 dark:text-violet-300">{story.name[0]}</div>
                    <p className="font-semibold text-slate-900 dark:text-white">{story.name}</p>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">{story.status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Feed</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Explore</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {homeFeedTabs.map((tab, index) => (
                    <button
                      key={tab}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        index === 0
                          ? "bg-violet-500 text-slate-950"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg transition hover:border-violet-500/20 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/10 dark:hover:shadow-violet-500/10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-600 dark:text-violet-300">{post.author[0]}</div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{post.author}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-500">{post.role} · {post.time}</p>
                        </div>
                      </div>
                      {currentUserId && post.authorId !== currentUserId && !post.isStatic ? (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/messages?userId=${post.authorId}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-sky-400/30 dark:hover:bg-white/10"
                          >
                            <Mail className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                            Message
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleFollow(post.authorId)}
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                              post.isFollowingAuthor
                                ? "border-violet-400/40 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-400/30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            }`}
                          >
                            {post.isFollowingAuthor ? "Following" : "Follow"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">{post.content}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        disabled={post.isStatic}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
                          post.liked
                            ? "bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <Heart className={`h-4 w-4 ${post.liked ? "fill-pink-400 text-pink-400" : "text-pink-400"}`} />
                        {post.stats.likes}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        disabled={post.isStatic}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition ${
                          post.showComments
                            ? "bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <MessageCircle className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                        {post.stats.comments}
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                        <Share2 className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                        {post.stats.shares}
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                        <Bookmark className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                        {post.stats.saves}
                      </button>
                    </div>
                    {post.interactionError ? (
                      <p className="mt-3 text-sm text-red-500 dark:text-red-400">{post.interactionError}</p>
                    ) : null}
                    {post.showComments ? (
                      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/80">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{comment.author}</p>
                            <p className="mt-1 text-xs text-slate-500">{comment.time}</p>
                            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                          </div>
                        ))}
                        {!post.isStatic ? (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              value={post.commentInput}
                              onChange={(event) =>
                                updatePost(post.id, (current) => ({
                                  ...current,
                                  commentInput: event.target.value,
                                }))
                              }
                              placeholder="Write a comment..."
                              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitComment(post.id)}
                              disabled={!post.commentInput.trim()}
                              className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Comment
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Trending</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Topics</h2>
                </div>
                <TrendingUp className="h-5 w-5 text-violet-500 dark:text-violet-300" />
              </div>
              <div className="mt-4 space-y-3">
                {homeTrendingTopics.map((topic) => (
                  <div key={topic} className="rounded-[2rem] border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
                    {topic}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Suggested</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">People to follow</h2>
                </div>
                <UserPlus className="h-5 w-5 text-violet-500 dark:text-violet-300" />
              </div>
              <div className="mt-4 space-y-3">
                {homeSuggestions.map((name) => (
                  <div key={name} className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900/80">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[2rem] bg-violet-500/15 text-violet-600 dark:text-violet-300">{name[0]}</div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-500">Active creator</p>
                      </div>
                    </div>
                    <button className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-200 dark:border-transparent dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">Follow</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300/80">Online</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Friends</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {homeOnlineFriends.map((friend) => (
                  <div key={friend} className="rounded-[2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
                    {friend}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
