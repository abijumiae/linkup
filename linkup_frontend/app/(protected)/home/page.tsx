"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSocket } from "@/src/components/SocketProvider";
import {
  Bookmark,
  Briefcase,
  CalendarDays,
  Heart,
  MessageCircle,
  PlusCircle,
  Share2,
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
import PulseMeter from "../../components/linkup/PulseMeter";
import OpportunityBoard from "../../components/linkup/OpportunityBoard";
import PulseFeedSkeleton from "../../components/linkup/PulseFeedSkeleton";
import FeedPostCard from "../../components/FeedPostCard";
import MomentsStrip from "@/src/components/MomentsStrip";
import DropMomentModal from "@/src/components/DropMomentModal";
import MomentViewer from "@/src/components/MomentViewer";
import {
  fetchMomentsFeedSafe,
  Moment,
  MomentGroup,
} from "@/src/lib/moments";
import { UploadMediaType } from "@/src/lib/uploads";

const LocalPulseCard = dynamic(
  () => import("../../components/linkup/LocalPulseCard"),
  {
    loading: () => (
      <div className="linkup-panel h-64 animate-pulse p-5">
        <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-14 rounded-2xl bg-slate-200 dark:bg-white/10"
            />
          ))}
        </div>
      </div>
    ),
  },
);

const QuickConnectPanel = dynamic(
  () => import("../../components/linkup/QuickConnectPanel"),
  {
    loading: () => (
      <div className="linkup-panel h-48 animate-pulse p-5">
        <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 h-24 rounded-2xl bg-slate-200 dark:bg-white/10" />
      </div>
    ),
  },
);

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
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
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
  const [momentGroups, setMomentGroups] = useState<MomentGroup[]>([]);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [momentsWarning, setMomentsWarning] = useState<string | null>(null);
  const [dropMomentOpen, setDropMomentOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);

  const loadMoments = () => {
    setMomentsLoading(true);
    fetchMomentsFeedSafe()
      .then(({ groups, warning }) => {
        setMomentGroups(groups);
        setMomentsWarning(warning);
      })
      .catch(() => {
        setMomentGroups([]);
        setMomentsWarning("Moments are warming up.");
      })
      .finally(() => setMomentsLoading(false));
  };

  useEffect(() => {
    setShowLocalPulse(getLocalProfilePrefs().showLocalPulse);
  }, []);

  const apiSparkCount = posts.filter((post) => !post.isStatic).length;
  const displaySparkCount = posts.length;

  useEffect(() => {
    setFeedLoading(true);
    setFeedError(null);
    fetchFeed(1)
      .then((data) => {
        setPosts(data.items.map(mapPostToFeedPost));
        setFeedPage(1);
        setFeedHasMore(data.hasMore);
      })
      .catch(() => {
        setFeedError("Could not load your feed. Showing sample Sparks.");
        setPosts(mapStaticPosts());
        setFeedHasMore(false);
      })
      .finally(() => setFeedLoading(false));

    async function loadPulseCounts() {
      try {
        const [groups, jobs, events] = await Promise.all([
          fetchGroups(1, 50).catch(() => ({ items: [], hasMore: false })),
          fetchJobs({ page: 1, limit: 50 }).catch(() => ({ items: [], hasMore: false })),
          fetchEvents({ page: 1, limit: 50 }).catch(() => ({ items: [], hasMore: false })),
        ]);
        setPulseCounts((current) => ({
          ...current,
          hubs: groups.items.length,
          work: jobs.items.length,
          happenings: events.items.length,
        }));
      } catch {
        // Placeholder counts remain at zero.
      }
    }

    void loadPulseCounts();
    loadMoments();
  }, []);

  async function loadMoreFeed() {
    if (feedLoadingMore || !feedHasMore) {
      return;
    }

    setFeedLoadingMore(true);
    const nextPage = feedPage + 1;

    try {
      const data = await fetchFeed(nextPage);
      setPosts((current) => [
        ...current,
        ...data.items.map(mapPostToFeedPost),
      ]);
      setFeedPage(nextPage);
      setFeedHasMore(data.hasMore);
    } catch {
      // Keep existing feed on load-more failure.
    } finally {
      setFeedLoadingMore(false);
    }
  }

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

    const onMomentCreated = (moment: Moment) => {
      if (!moment?.id || !moment.user) {
        loadMoments();
        return;
      }

      setMomentGroups((current) => {
        const next = [...current];
        const groupIndex = next.findIndex(
          (group) => group.user.id === moment.userId,
        );

        if (groupIndex >= 0) {
          const group = next[groupIndex];
          const withoutDuplicate = group.moments.filter(
            (item) => item.id !== moment.id,
          );
          next[groupIndex] = {
            ...group,
            moments: [...withoutDuplicate, moment].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            ),
          };
        } else {
          next.unshift({
            user: moment.user,
            moments: [moment],
          });
        }

        if (currentUserId) {
          next.sort((a, b) => {
            if (a.user.id === currentUserId) return -1;
            if (b.user.id === currentUserId) return 1;
            const aLatest = a.moments[a.moments.length - 1]?.createdAt ?? "";
            const bLatest = b.moments[b.moments.length - 1]?.createdAt ?? "";
            return (
              new Date(bLatest).getTime() - new Date(aLatest).getTime()
            );
          });
        }

        return next;
      });
    };

    socket.on("moment_created", onMomentCreated);

    const onMomentDeleted = (payload: { momentId?: string; userId?: string }) => {
      if (!payload?.momentId) {
        return;
      }

      setMomentGroups((current) => {
        const next = current
          .map((group) => ({
            ...group,
            moments: group.moments.filter(
              (moment) => moment.id !== payload.momentId,
            ),
          }))
          .filter((group) => group.moments.length > 0);

        return next;
      });
    };

    socket.on("moment_deleted", onMomentDeleted);

    return () => {
      socket.off("spark_created", onSparkCreated);
      socket.off("moment_created", onMomentCreated);
      socket.off("moment_deleted", onMomentDeleted);
    };
  }, [socket, currentUserId]);

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

  const activeMomentGroups = useMemo(
    () => momentGroups.filter((group) => group.moments.length > 0),
    [momentGroups],
  );

  const viewerInitialIndex =
    viewerGroupIndex !== null && momentGroups[viewerGroupIndex]
      ? activeMomentGroups.findIndex(
          (group) => group.user.id === momentGroups[viewerGroupIndex]?.user.id,
        )
      : -1;

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
            <header className="linkup-panel relative overflow-hidden p-6 sm:p-7">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-brand-primary/10 via-brand-secondary/5 to-transparent dark:from-brand-primary/15" />
              <p className="linkup-eyebrow">LinkUp Pulse</p>
              <h1 className="linkup-title mt-3">Pulse</h1>
              <p className="linkup-subtitle max-w-3xl text-base leading-7">
                Your social workspace for sparks, people, hubs, and opportunities.
              </p>
            </header>

            {sparkNotice ? (
              <p className="rounded-3xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
                {sparkNotice}
              </p>
            ) : null}

            {momentsWarning ? (
              <p className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {momentsWarning}
              </p>
            ) : null}

            <MomentsStrip
              groups={momentGroups}
              currentUserId={currentUserId}
              isLoading={momentsLoading}
              onDropMoment={() => setDropMomentOpen(true)}
              onOpenGroup={(index) => setViewerGroupIndex(index)}
            />

            <DropMomentModal
              open={dropMomentOpen}
              onClose={() => setDropMomentOpen(false)}
              onCreated={loadMoments}
            />

            {viewerGroupIndex !== null && viewerInitialIndex >= 0 ? (
              <MomentViewer
                groups={activeMomentGroups}
                initialGroupIndex={viewerInitialIndex}
                currentUserId={currentUserId}
                onClose={() => setViewerGroupIndex(null)}
                onDeleted={loadMoments}
              />
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
              onDropMoment={() => setDropMomentOpen(true)}
            />

            <section
              id="fresh-drops"
              className="linkup-panel p-5 sm:p-6"
            >
              <p className="linkup-eyebrow">Fresh Drops</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                Sparks from your network
              </h2>

              {feedError ? (
                <p className="linkup-alert-warning mt-4" role="status">
                  {feedError}
                </p>
              ) : null}

              <div className="mt-6 space-y-4">
                {feedLoading ? (
                  <PulseFeedSkeleton count={3} />
                ) : posts.length === 0 ? (
                  <div className="linkup-empty p-10 text-center sm:p-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
                      Your Pulse is warming up
                    </h3>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Connect with people, join hubs, or drop your first Spark.
                    </p>
                    <button
                      type="button"
                      onClick={focusSparkInput}
                      className="linkup-btn-primary mt-6 min-h-[44px]"
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
                        className="linkup-card p-5 transition hover:border-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/5 sm:p-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/20">
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
                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 text-sm dark:border-white/10 sm:gap-3">
                          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <Heart className="h-4 w-4 text-pink-400" />
                            Boost {post.stats.likes}
                          </span>
                          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <MessageCircle className="h-4 w-4 text-brand-secondary" />
                            Reply {post.stats.comments}
                          </span>
                          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <Share2 className="h-4 w-4 text-brand-secondary" />
                            Share {post.stats.shares}
                          </span>
                          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                            <Bookmark className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                            Save {post.stats.saves}
                          </span>
                        </div>
                      </article>
                    ),
                  )
                )}
                {!feedLoading && feedHasMore ? (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => void loadMoreFeed()}
                      disabled={feedLoadingMore}
                      className="linkup-btn-secondary min-h-[44px] transition-all duration-200 ease-out disabled:opacity-60"
                    >
                      {feedLoadingMore ? "Loading..." : "Load more Sparks"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
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
