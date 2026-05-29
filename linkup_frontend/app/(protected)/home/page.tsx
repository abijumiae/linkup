"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/src/components/SocketProvider";
import {
  Briefcase,
  CalendarDays,
  Heart,
  MessageCircle,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { homePosts, homeSuggestions } from "../../data/linkupData";
import { getLocalProfilePrefs, markDailySparkComplete } from "../../../src/lib/linkupFeatures";
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
import DailySparkCard from "../../components/linkup/DailySparkCard";
import LocalPulseCard from "../../components/linkup/LocalPulseCard";
import OpportunityBoard from "../../components/linkup/OpportunityBoard";
import PulseMeter from "../../components/linkup/PulseMeter";
import QuickConnectPanel from "../../components/linkup/QuickConnectPanel";
import FeedPostCard from "../../components/FeedPostCard";
import { UploadMediaType } from "@/src/lib/uploads";

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
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const { socket } = useSocket();
  const sparkInputRef = useRef<HTMLTextAreaElement>(null);

  const [postContent, setPostContent] = useState("");
  const [sparkMedia, setSparkMedia] = useState<{
    url: string;
    type: UploadMediaType;
  } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sparkNotice, setSparkNotice] = useState<string | null>(null);
  const [sparkDroppedToday, setSparkDroppedToday] = useState(false);
  const [pulseCounts, setPulseCounts] = useState({
    sparks: 0,
    hubs: 0,
    connects: 0,
    work: 0,
    happenings: 0,
  });
  const [showLocalPulse, setShowLocalPulse] = useState(true);

  useEffect(() => {
    setShowLocalPulse(getLocalProfilePrefs().showLocalPulse);
  }, []);

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
    if (!socket) {
      return;
    }

    socket.emit("join_pulse");

    const onSparkCreated = (post: ApiFeedPost) => {
      if (!post?.id) {
        setSparkNotice("New Spark available");
        return;
      }

      const mapped = mapPostToFeedPost({
        ...post,
        likeCount: post.likeCount ?? 0,
        commentCount: post.commentCount ?? 0,
        liked: post.liked ?? false,
        isFollowingAuthor: post.isFollowingAuthor ?? false,
      });

      setPosts((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== mapped.id);
        return [mapped, ...withoutDuplicate.filter((item) => !item.isStatic)];
      });
      setSparkNotice("New Spark available");
    };

    socket.on("spark_created", onSparkCreated);

    return () => {
      socket.off("spark_created", onSparkCreated);
    };
  }, [socket]);

  useEffect(() => {
    if (!sparkNotice) {
      return;
    }

    const timer = setTimeout(() => setSparkNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [sparkNotice]);

  useEffect(() => {
    setPulseCounts((current) => ({
      ...current,
      sparks: displaySparkCount,
    }));
  }, [displaySparkCount]);

  async function handleCreatePost() {
    const trimmed = postContent.trim();

    if ((!trimmed && !sparkMedia) || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createPost({
        content: trimmed,
        ...(sparkMedia
          ? {
              mediaUrl: sparkMedia.url,
              mediaType:
                sparkMedia.type === "video" ? ("video" as const) : ("image" as const),
            }
          : {}),
      });
      setPostContent("");
      setSparkMedia(null);
      markDailySparkComplete();
      setSparkDroppedToday(true);
      setSuccess("Your Spark is live.");

      const mapped = mapPostToFeedPost({
        ...created,
        likeCount: 0,
        commentCount: 0,
        liked: false,
        isFollowingAuthor: false,
      });

      setPosts((current) => {
        const withoutDuplicate = current.filter((post) => post.id !== mapped.id);
        return [mapped, ...withoutDuplicate.filter((post) => !post.isStatic)];
      });

      try {
        const refreshed = await fetchFeed();
        if (refreshed.length > 0) {
          setPosts(refreshed.map(mapPostToFeedPost));
        }
      } catch {
        // Optimistic update above is enough if refresh fails.
      }
    } catch {
      setError("Could not drop your Spark. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function focusSparkInput() {
    sparkInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    sparkInputRef.current?.focus();
  }

  const pulseMeterStats = [
    {
      label: "Today's Sparks",
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
      label: "New Connects",
      value: pulseCounts.connects > 0 ? String(pulseCounts.connects) : "—",
      icon: UserPlus,
      href: "/explore",
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

  const quickConnectSuggestions = homeSuggestions.map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    username: name.toLowerCase().replace(/\s+/g, ""),
    subtitle: "Suggested creator",
  }));

  const opportunityItems = [
    {
      title: "Market",
      description: "Discover fresh listings from your network.",
      href: "/marketplace",
      icon: ShoppingBag,
    },
    {
      title: "Work",
      description: "Find projects and roles worth your time.",
      href: "/jobs",
      icon: Briefcase,
    },
    {
      title: "Happenings",
      description: "Join what's moving around you.",
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
              <p className="linkup-eyebrow">LinkUp Pulse</p>
              <h1 className="linkup-title mt-3">Pulse</h1>
              <p className="linkup-subtitle">
                People, communities, opportunities — all in one social workspace.
              </p>
            </header>

            {sparkNotice ? (
              <p className="rounded-3xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
                {sparkNotice}
              </p>
            ) : null}

            <PulseMeter stats={pulseMeterStats} />

            <DailySparkCard
              value={postContent}
              onChange={(value) => {
                setPostContent(value);
                if (error) setError(null);
                if (success) setSuccess(null);
              }}
              onSubmit={handleCreatePost}
              isSubmitting={isSubmitting}
              error={error}
              success={success}
              sparkDroppedToday={sparkDroppedToday}
              inputRef={sparkInputRef}
              media={sparkMedia}
              onMediaChange={(value) => {
                setSparkMedia(value);
                if (error) setError(null);
                if (success) setSuccess(null);
              }}
            />

            <section
              id="fresh-drops"
              className="linkup-panel p-5 sm:p-6"
            >
              <p className="linkup-eyebrow">Fresh Drops</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                Sparks from your network
              </h2>

              <div className="mt-6 space-y-4">
                {posts.length === 0 ? (
                  <div className="linkup-empty p-10 text-center">
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
                      className="linkup-btn-primary mt-5 min-h-[44px]"
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
                        className="linkup-card p-5"
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
            <LocalPulseCard
              country={currentUser?.country}
              enabled={showLocalPulse}
            />
            <QuickConnectPanel suggestions={quickConnectSuggestions} />
            <OpportunityBoard items={opportunityItems} />
          </aside>
        </div>
      </div>
    </div>
  );
}
