"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Heart,
  MessageCircle,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { homePosts, homeSuggestions } from "../../data/linkupData";
import { ApiError } from "../../../src/lib/api";
import { getCurrentUser } from "../../../src/lib/auth";
import { fetchEvents } from "../../../src/lib/events";
import { fetchGroups } from "../../../src/lib/groups";
import { fetchJobs } from "../../../src/lib/jobs";
import {
  createPost,
  fetchFeed,
  FeedPost as ApiFeedPost,
  formatAccountType,
  formatTimeAgo,
} from "../../../src/lib/posts";
import FeedPostCard from "../../components/FeedPostCard";

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
  apiPost?: ApiFeedPost;
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
    apiPost: post,
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

export default function HomeDashboardPage() {
  const currentUserId = getCurrentUser()?.id ?? null;
  const sparkInputRef = useRef<HTMLTextAreaElement>(null);

  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseCounts, setPulseCounts] = useState({
    sparks: 0,
    hubs: 0,
    work: 0,
    happenings: 0,
  });

  const apiSparkCount = posts.filter((post) => !post.isStatic).length;
  const displaySparkCount = posts.length;

  useEffect(() => {
    fetchFeed()
      .then((data) => {
        if (data.length > 0) {
          setPosts(data.map(mapPostToFeedPost));
        } else {
          setPosts([]);
        }
      })
      .catch(() => {
        setPosts(mapStaticPosts());
      });

    async function loadPulseCounts() {
      try {
        const [groups, jobs, events] = await Promise.all([
          fetchGroups().catch(() => []),
          fetchJobs().catch(() => []),
          fetchEvents().catch(() => []),
        ]);
        setPulseCounts((current) => ({
          ...current,
          hubs: groups.length,
          work: jobs.length,
          happenings: events.length,
        }));
      } catch {
        // Placeholder counts remain at zero.
      }
    }

    void loadPulseCounts();
  }, []);

  useEffect(() => {
    setPulseCounts((current) => ({
      ...current,
      sparks: displaySparkCount,
    }));
  }, [displaySparkCount]);

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
      setError(
        err instanceof ApiError ? err.message : "Failed to drop spark",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function focusSparkInput() {
    sparkInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    sparkInputRef.current?.focus();
  }

  const todaysPulseCards = [
    {
      label: "New Sparks",
      value: String(pulseCounts.sparks || displaySparkCount),
      icon: Sparkles,
      href: "#fresh-drops",
    },
    {
      label: "Active Hubs",
      value: pulseCounts.hubs > 0 ? String(pulseCounts.hubs) : "—",
      icon: Users,
      href: "/groups",
    },
    {
      label: "Work Drops",
      value: pulseCounts.work > 0 ? String(pulseCounts.work) : "—",
      icon: Briefcase,
      href: "/jobs",
    },
    {
      label: "Happenings",
      value: pulseCounts.happenings > 0 ? String(pulseCounts.happenings) : "—",
      icon: CalendarDays,
      href: "/events",
    },
  ];

  const opportunityCards = [
    {
      title: "Market",
      description: "Discover fresh listings from your network.",
      href: "/marketplace",
      icon: ShoppingBag,
    },
    {
      title: "Work",
      description: "Find roles, projects, and opportunities.",
      href: "/jobs",
      icon: Briefcase,
    },
    {
      title: "Happenings",
      description: "See what's happening around you.",
      href: "/events",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide max-w-[1760px]">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <main className="min-w-0 space-y-6">
            <header className="linkup-panel p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                LinkUp Pulse
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Pulse
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Catch what&apos;s moving across your world today.
              </p>
            </header>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                Today&apos;s Pulse
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {todaysPulseCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.label}
                      href={card.href}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/80 dark:hover:bg-brand-primary/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Icon className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
                        <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                          {card.value}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {card.label}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                    Daily Spark
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    Drop your spark
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreatePost()}
                  disabled={!postContent.trim() || isSubmitting}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? "Dropping…" : "Drop Spark"}
                </button>
              </div>
              <textarea
                ref={sparkInputRef}
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                className="mt-5 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
                placeholder="Drop your spark..."
              />
              {error ? (
                <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              ) : null}
            </section>

            <section
              id="fresh-drops"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                Fresh Drops
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                Sparks from your network
              </h2>

              <div className="mt-6 space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-white/15 dark:bg-brand-dark/60">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      No sparks yet
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                      Drop the first spark and start the pulse.
                    </p>
                    <button
                      type="button"
                      onClick={focusSparkInput}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Drop Spark
                    </button>
                  </div>
                ) : (
                  posts.map((post) =>
                    post.apiPost && !post.isStatic ? (
                      <FeedPostCard
                        key={post.id}
                        post={post.apiPost}
                        currentUserId={currentUserId}
                        pulseLabels
                      />
                    ) : (
                      <article
                        key={post.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-brand-dark/80"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                              {getInitials(post.author)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {post.author}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-500">
                                {post.role} · {post.time}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
                          {post.content}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <Heart className="h-4 w-4 text-pink-400" />
                            Boost {post.stats.likes}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <MessageCircle className="h-4 w-4 text-brand-secondary" />
                            Reply {post.stats.comments}
                          </span>
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            </section>
          </main>

          <aside className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-brand-dark/80">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                Quick Connect
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                Suggested connections
              </h2>
              <div className="mt-4 space-y-3">
                {homeSuggestions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/60 dark:text-slate-400">
                    Search Discover to find people to connect with.
                  </p>
                ) : (
                  homeSuggestions.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                          {getInitials(name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            @{name.toLowerCase().replace(/\s+/g, "")}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/explore"
                        className="rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
                      >
                        Connect
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-brand-dark/80">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                Opportunity Board
              </p>
              <div className="mt-4 space-y-3">
                {opportunityCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.title}
                      href={card.href}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/80 dark:hover:bg-brand-primary/10"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {card.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
