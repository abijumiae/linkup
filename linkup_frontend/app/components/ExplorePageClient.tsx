"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clapperboard,
  Compass,
  Hash,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import {
  DiscoverData,
  EMPTY_DISCOVER_DATA,
  fetchDiscoverSafe,
  searchAll,
  SearchUser,
} from "@/src/lib/discovery";
import { FeedPost } from "@/src/lib/posts";
import { useSocket } from "@/src/components/SocketProvider";
import DiscoverHubCard from "./discover/DiscoverHubCard";
import DiscoverOpportunityCard from "./discover/DiscoverOpportunityCard";
import DiscoverPersonCard from "./discover/DiscoverPersonCard";
import { DiscoverPageSkeleton } from "./discover/DiscoverSkeleton";
import DiscoverTrendingCard from "./discover/DiscoverTrendingCard";
import FeedPostCard from "./FeedPostCard";
import SearchUserCard from "./SearchUserCard";

const LocalPulseCard = dynamic(() => import("./linkup/LocalPulseCard"), {
  loading: () => (
    <div className="linkup-panel h-48 animate-pulse p-5">
      <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  ),
});

type DiscoverTab =
  | "all"
  | "people"
  | "sparks"
  | "hubs"
  | "watch"
  | "market"
  | "work"
  | "happenings"
  | "tags";

const tabs: { id: DiscoverTab; label: string; icon: typeof TrendingUp }[] = [
  { id: "all", label: "All", icon: Compass },
  { id: "people", label: "People", icon: Users },
  { id: "sparks", label: "Sparks", icon: Sparkles },
  { id: "hubs", label: "Hubs", icon: Users },
  { id: "watch", label: "Watch", icon: Clapperboard },
  { id: "market", label: "Market", icon: ShoppingBag },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "happenings", label: "Happenings", icon: CalendarDays },
  { id: "tags", label: "Tags", icon: Hash },
];

function SectionShell({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="linkup-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="linkup-eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-600 dark:border-white/15 dark:bg-brand-dark/50 dark:text-slate-400">
      {message}
    </div>
  );
}

function DiscoverEmptyState({
  title = "Nothing trending yet",
  message = "Start by dropping a Spark or joining a Hub.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="linkup-empty p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
        <Compass className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/home" className="linkup-btn-primary min-h-[44px]">
          Drop Spark
        </Link>
        <Link href="/groups" className="linkup-btn-secondary min-h-[44px]">
          Explore Hubs
        </Link>
      </div>
    </div>
  );
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

export default function ExplorePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const currentUserRole = currentUser?.role ?? null;
  const { socket } = useSocket();

  const [searchInput, setSearchInput] = useState(queryParam);
  const [activeQuery, setActiveQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<DiscoverTab>("all");
  const [discover, setDiscover] = useState<DiscoverData>(EMPTY_DISCOVER_DATA);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [searchPosts, setSearchPosts] = useState<FeedPost[]>([]);
  const [searchHubs, setSearchHubs] = useState<DiscoverData["hubs"]>([]);
  const [searchMarket, setSearchMarket] = useState<DiscoverData["market"]>([]);
  const [searchWork, setSearchWork] = useState<DiscoverData["work"]>([]);
  const [searchHappenings, setSearchHappenings] = useState<DiscoverData["happenings"]>([]);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchTab, setSearchTab] = useState<DiscoverTab>("all");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadDiscover = useCallback(async () => {
    const result = await fetchDiscoverSafe();
    setDiscover(result.data);
    setDataWarning(result.warning);
  }, []);

  const loadSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchUsers([]);
        setSearchPosts([]);
        setSearchHubs([]);
        setSearchMarket([]);
        setSearchWork([]);
        setSearchHappenings([]);
        setSearchTags([]);
        setSearchError(null);
        await loadDiscover();
        return;
      }

      setIsSearchLoading(true);
      try {
        const results = await searchAll(query);
        setSearchUsers(results.users);
        setSearchPosts(results.posts);
        setSearchHubs(results.hubs);
        setSearchMarket(results.market);
        setSearchWork(results.work);
        setSearchHappenings(results.happenings);
        setSearchTags(results.tags);
        setSearchError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          throw err;
        }
        setSearchUsers([]);
        setSearchPosts([]);
        setSearchHubs([]);
        setSearchMarket([]);
        setSearchWork([]);
        setSearchHappenings([]);
        setSearchTags([]);
        setSearchError("Search is warming up. Try again in a moment.");
      } finally {
        setIsSearchLoading(false);
      }
    },
    [loadDiscover],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setDataWarning(null);
      setSearchError(null);

      try {
        if (queryParam.trim()) {
          await loadSearch(queryParam);
          setActiveTab("all");
        } else {
          await loadDiscover();
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setDiscover(EMPTY_DISCOVER_DATA);
        setDataWarning("Discover data is warming up.");
      } finally {
        setIsLoading(false);
      }
    }

    void init();
  }, [queryParam, loadDiscover, loadSearch, router]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("join_pulse");

    const patchPostCounts = (
      postId: string,
      patch: Partial<Pick<FeedPost, "likeCount" | "commentCount">>,
    ) => {
      const updater = (posts: FeedPost[]) =>
        posts.map((post) =>
          post.id === postId ? { ...post, ...patch } : post,
        );

      setSearchPosts(updater);
      setDiscover((current) => ({
        ...current,
        sparks: updater(current.sparks),
      }));
    };

    const onPostBoosted = (payload: {
      postId?: string;
      boostCount?: number;
      likeCount?: number;
    }) => {
      if (!payload.postId) return;
      const count = payload.boostCount ?? payload.likeCount ?? 0;
      patchPostCounts(payload.postId, { likeCount: count });
    };

    const onPostCommented = (payload: {
      postId?: string;
      commentCount?: number;
    }) => {
      if (!payload.postId || payload.commentCount == null) return;
      patchPostCounts(payload.postId, { commentCount: payload.commentCount });
    };

    const patchPost = (
      postId: string,
      patch: Partial<
        Pick<FeedPost, "content" | "imageUrl" | "videoUrl" | "updatedAt">
      >,
    ) => {
      const updater = (posts: FeedPost[]) =>
        posts.map((post) =>
          post.id === postId ? { ...post, ...patch } : post,
        );

      setSearchPosts(updater);
      setDiscover((current) => ({
        ...current,
        sparks: updater(current.sparks),
      }));
    };

    const removePost = (postId: string) => {
      const filterPosts = (posts: FeedPost[]) =>
        posts.filter((post) => post.id !== postId);

      setSearchPosts(filterPosts);
      setDiscover((current) => ({
        ...current,
        sparks: filterPosts(current.sparks),
      }));
    };

    const onPostUpdated = (payload: {
      id?: string;
      content?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      updatedAt?: string;
    }) => {
      if (!payload.id) return;
      patchPost(payload.id, {
        content: payload.content,
        imageUrl:
          payload.imageUrl !== undefined ? payload.imageUrl : undefined,
        videoUrl:
          payload.videoUrl !== undefined ? payload.videoUrl : undefined,
        updatedAt: payload.updatedAt,
      });
    };

    const onPostDeleted = (payload: { id?: string }) => {
      if (!payload.id) return;
      removePost(payload.id);
    };

    socket.on("post_boosted", onPostBoosted);
    socket.on("post_unboosted", onPostBoosted);
    socket.on("post_commented", onPostCommented);
    socket.on("post_updated", onPostUpdated);
    socket.on("post_deleted", onPostDeleted);

    return () => {
      socket.off("post_boosted", onPostBoosted);
      socket.off("post_unboosted", onPostBoosted);
      socket.off("post_commented", onPostCommented);
      socket.off("post_updated", onPostUpdated);
      socket.off("post_deleted", onPostDeleted);
    };
  }, [socket]);

  useEffect(() => {
    setSearchInput(queryParam);
    setActiveQuery(queryParam);
  }, [queryParam]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchInput.trim();

    if (!trimmed) {
      router.push("/explore");
      return;
    }

    router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
  }

  const isSearchMode = activeQuery.trim().length > 0;

  const sparks = useMemo(
    () => (isSearchMode ? searchPosts : discover?.sparks ?? []),
    [discover?.sparks, isSearchMode, searchPosts],
  );

  const people = useMemo(
    () => (isSearchMode ? searchUsers : discover?.people ?? []),
    [discover?.people, isSearchMode, searchUsers],
  );

  const trendingCards = useMemo(() => {
    const cards = [];

    if (discover.sparks[0]) {
      cards.push({
        key: "spark",
        title: "Trending Spark",
        description: discover.sparks[0].content.slice(0, 120),
        cta: "View Spark",
        href: "/explore",
        icon: Sparkles,
        accent: "primary" as const,
      });
    }

    if (discover.hubs[0]) {
      cards.push({
        key: "hub",
        title: "Rising Hub",
        description: `${discover.hubs[0].name} · ${discover.hubs[0].membersCount} members`,
        cta: "Explore Hub",
        href: `/groups/${discover.hubs[0].id}`,
        icon: Users,
        accent: "secondary" as const,
      });
    }

    if (discover.work[0]) {
      cards.push({
        key: "work",
        title: "Hot Work Drop",
        description: `${discover.work[0].title} at ${discover.work[0].company}`,
        cta: "View Role",
        href: `/jobs/${discover.work[0].id}`,
        icon: Briefcase,
        accent: "amber" as const,
      });
    }

    if (discover.happenings[0]) {
      cards.push({
        key: "happening",
        title: "Happening Today",
        description: `${discover.happenings[0].title} · ${discover.happenings[0].location}`,
        cta: "See Event",
        href: `/events/${discover.happenings[0].id}`,
        icon: CalendarDays,
        accent: "pink" as const,
      });
    }

    if (discover.watch[0]) {
      cards.push({
        key: "watch",
        title: "Watch Pick",
        description: discover.watch[0].title,
        cta: "Watch Now",
        href: `/watch/${discover.watch[0].id}`,
        icon: Clapperboard,
        accent: "emerald" as const,
      });
    }

    return cards;
  }, [discover]);

  function renderSparks(posts: FeedPost[], emptyMessage?: string) {
    if (posts.length === 0) {
      return (
        <DiscoverEmptyState message={emptyMessage ?? "Start by dropping a Spark or joining a Hub."} />
      );
    }

    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            pulseLabels
            onPostUpdated={(updated) => {
              const updater = (items: FeedPost[]) =>
                items.map((item) => (item.id === updated.id ? updated : item));
              setSearchPosts(updater);
              setDiscover((current) => ({
                ...current,
                sparks: updater(current.sparks),
              }));
            }}
            onPostDeleted={(postId) => {
              const filterPosts = (items: FeedPost[]) =>
                items.filter((item) => item.id !== postId);
              setSearchPosts(filterPosts);
              setDiscover((current) => ({
                ...current,
                sparks: filterPosts(current.sparks),
              }));
            }}
          />
        ))}
      </div>
    );
  }

  function renderSearchResults() {
    const hasUsers = searchUsers.length > 0;
    const hasSparks = searchPosts.length > 0;
    const hasHubs = searchHubs.length > 0;
    const hasMarket = searchMarket.length > 0;
    const hasWork = searchWork.length > 0;
    const hasHappenings = searchHappenings.length > 0;
    const hasTags = searchTags.length > 0;
    const hasAny =
      hasUsers ||
      hasSparks ||
      hasHubs ||
      hasMarket ||
      hasWork ||
      hasHappenings ||
      hasTags;

    if (!hasAny) {
      return (
        <DiscoverEmptyState message="No results found." />
      );
    }

    const showAll = searchTab === "all";

    return (
      <div className="space-y-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs
            .filter((tab) => tab.id !== "watch")
            .map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchTab(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  searchTab === tab.id
                    ? "bg-brand-primary text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {(showAll || searchTab === "people") && hasUsers ? (
          <SectionShell eyebrow="People" title="Matching people">
            <div className="space-y-3">
              {searchUsers.map((user) => (
                <SearchUserCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "sparks") && hasSparks ? (
          <SectionShell eyebrow="Sparks" title="Matching sparks">
            {renderSparks(searchPosts)}
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "hubs") && hasHubs ? (
          <SectionShell eyebrow="Hubs" title="Matching hubs">
            <div className="grid gap-4 sm:grid-cols-2">
              {searchHubs.map((hub) => (
                <DiscoverHubCard key={hub.id} hub={hub} />
              ))}
            </div>
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "market") && hasMarket ? (
          <SectionShell eyebrow="Market" title="Matching listings">
            <div className="grid gap-4 sm:grid-cols-2">
              {searchMarket.map((item) => (
                <DiscoverOpportunityCard
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.category} · ${item.currency} ${item.price}`}
                  href={`/marketplace/${item.id}`}
                  cta="View listing"
                  icon={ShoppingBag}
                />
              ))}
            </div>
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "work") && hasWork ? (
          <SectionShell eyebrow="Work" title="Matching roles">
            <div className="grid gap-4 sm:grid-cols-2">
              {searchWork.map((job) => (
                <DiscoverOpportunityCard
                  key={job.id}
                  title={job.title}
                  subtitle={`${job.company} · ${job.location}`}
                  href={`/jobs/${job.id}`}
                  cta="View role"
                  icon={Briefcase}
                />
              ))}
            </div>
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "happenings") && hasHappenings ? (
          <SectionShell eyebrow="Happenings" title="Matching events">
            <div className="grid gap-4 sm:grid-cols-2">
              {searchHappenings.map((event) => (
                <DiscoverOpportunityCard
                  key={event.id}
                  title={event.title}
                  subtitle={`${event.location} · ${event.attendeesCount} going`}
                  href={`/events/${event.id}`}
                  cta="View event"
                  icon={CalendarDays}
                />
              ))}
            </div>
          </SectionShell>
        ) : null}

        {(showAll || searchTab === "tags") && hasTags ? (
          <SectionShell eyebrow="Tags" title="Matching tags">
            <div className="flex flex-wrap gap-2">
              {searchTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/explore?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary dark:text-brand-secondary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </SectionShell>
        ) : null}
      </div>
    );
  }

  function renderDiscoverSections() {
    const showAll = activeTab === "all";
    const sections: React.ReactNode[] = [];

    if (showAll || activeTab === "people") {
      sections.push(
        <SectionShell
          key="people"
          eyebrow="Connect"
          title="People to Connect"
          action={
            people.length > 0 ? (
              <Link
                href="/explore"
                className="text-sm font-semibold text-brand-primary dark:text-brand-secondary"
              >
                See all →
              </Link>
            ) : undefined
          }
        >
          {people.length > 0 ? (
            <div className="space-y-3">
              {people.map((user) => (
                <DiscoverPersonCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No people suggestions yet." />
          )}
        </SectionShell>,
      );
    }

    if (showAll || activeTab === "hubs") {
      sections.push(
        <SectionShell
          key="hubs"
          eyebrow="Communities"
          title="Explore Hubs"
          action={
            <Link href="/groups" className="linkup-btn-ghost min-h-[40px] text-xs">
              Browse all
            </Link>
          }
        >
          {discover.hubs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {discover.hubs.map((hub) => (
                <DiscoverHubCard key={hub.id} hub={hub} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No hubs to explore yet." />
          )}
        </SectionShell>,
      );
    }

    if (showAll || activeTab === "sparks") {
      sections.push(
        <SectionShell key="sparks" eyebrow="Feed" title="Fresh Sparks">
          {sparks.length > 0 ? (
            renderSparks(sparks)
          ) : (
            <SectionEmpty message="No fresh sparks yet." />
          )}
        </SectionShell>,
      );
    }

    if (showAll || activeTab === "watch") {
      sections.push(
        <SectionShell
          key="watch"
          eyebrow="Watch"
          title="Watch picks"
          action={
            <Link href="/watch" className="linkup-btn-ghost min-h-[40px] text-xs">
              Open Watch
            </Link>
          }
        >
          {discover.watch.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {discover.watch.map((video) => (
                <DiscoverOpportunityCard
                  key={video.id}
                  title={video.title}
                  subtitle={video.description ?? "Stream from the LinkUp community."}
                  meta={video.category ?? "Watch"}
                  href={`/watch/${video.id}`}
                  cta="Watch"
                  icon={Clapperboard}
                />
              ))}
            </div>
          ) : (
            <DiscoverEmptyState message="No watch picks yet. Check back soon." />
          )}
        </SectionShell>,
      );
    }

    if (showAll || activeTab === "market" || activeTab === "work" || activeTab === "happenings") {
      const opportunities = [];

      if ((showAll || activeTab === "market") && discover.market.length > 0) {
        opportunities.push(
          ...discover.market.map((item) => (
            <DiscoverOpportunityCard
              key={`market-${item.id}`}
              title={item.title}
              subtitle={item.description}
              meta={`${formatPrice(item.price, item.currency)} · ${item.category}`}
              href={`/marketplace/${item.id}`}
              cta="View listing"
              icon={ShoppingBag}
            />
          )),
        );
      }

      if ((showAll || activeTab === "work") && discover.work.length > 0) {
        opportunities.push(
          ...discover.work.map((job) => (
            <DiscoverOpportunityCard
              key={`job-${job.id}`}
              title={job.title}
              subtitle={`${job.company} · ${job.location}`}
              meta={job.jobType ?? "Work opportunity"}
              href={`/jobs/${job.id}`}
              cta="View role"
              icon={Briefcase}
            />
          )),
        );
      }

      if ((showAll || activeTab === "happenings") && discover.happenings.length > 0) {
        opportunities.push(
          ...discover.happenings.map((event) => (
            <DiscoverOpportunityCard
              key={`event-${event.id}`}
              title={event.title}
              subtitle={`${event.location} · ${formatEventDate(event.startDate)}`}
              meta={`${event.attendeesCount} going`}
              href={`/events/${event.id}`}
              cta="View happening"
              icon={CalendarDays}
            />
          )),
        );
      }

      if (showAll || activeTab === "market" || activeTab === "work" || activeTab === "happenings") {
        sections.push(
          <SectionShell
            key="opportunities"
            eyebrow="Opportunities"
            title={
              activeTab === "market"
                ? "Market listings"
                : activeTab === "work"
                  ? "Work opportunities"
                  : activeTab === "happenings"
                    ? "Upcoming happenings"
                    : "Opportunities Around You"
            }
          >
            {opportunities.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {opportunities}
              </div>
            ) : (
              <DiscoverEmptyState message="No opportunities in this category yet." />
            )}
          </SectionShell>,
        );
      }
    }

    if (activeTab === "tags") {
      sections.push(
        <SectionShell key="tags" eyebrow="Topics" title="Trending topics">
          <div className="flex flex-wrap gap-2">
            {(discover.tags.length > 0 ? discover.tags : ["Tech", "Design"]).map(
              (tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    router.push(`/explore?q=${encodeURIComponent(tag)}`)
                  }
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-primary/35 hover:bg-brand-primary/5 active:scale-[0.98] dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200 dark:hover:bg-brand-primary/10"
                >
                  <Hash className="h-3.5 w-3.5 text-brand-primary dark:text-brand-secondary" />
                  {tag}
                </button>
              ),
            )}
          </div>
        </SectionShell>,
      );
    }

    if (showAll && trendingCards.length > 0) {
      sections.unshift(
        <SectionShell key="trending" eyebrow="Trending" title="Trending Now">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {trendingCards.map(({ key, ...card }) => (
              <DiscoverTrendingCard key={key} {...card} />
            ))}
          </div>
        </SectionShell>,
      );
    } else if (showAll) {
      sections.unshift(
        <SectionShell key="trending" eyebrow="Trending" title="Trending Now">
          <SectionEmpty message="Nothing trending yet. Start by dropping a Spark." />
        </SectionShell>,
      );
    }

    return <div className="space-y-6">{sections}</div>;
  }

  function renderTabContent() {
    if (isSearchMode) {
      if (isSearchLoading) {
        return (
          <div className="space-y-4">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="linkup-panel h-28 animate-pulse p-5"
              />
            ))}
          </div>
        );
      }
      return renderSearchResults();
    }

    if (activeTab === "people" && people.length === 0) {
      return renderDiscoverSections();
    }

    if (activeTab === "sparks" && sparks.length === 0) {
      return renderDiscoverSections();
    }

    if (activeTab === "hubs" && discover.hubs.length === 0) {
      return renderDiscoverSections();
    }

    return renderDiscoverSections();
  }

  if (isLoading) {
    return (
      <div className="linkup-page">
        <div className="linkup-container-wide">
          <DiscoverPageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <div className="space-y-6">
          <header className="linkup-panel relative overflow-hidden p-6 sm:p-7">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-brand-primary/10 via-brand-secondary/5 to-transparent dark:from-brand-primary/15" />
            <div className="relative flex flex-col gap-4">
              <div>
                <p className="linkup-eyebrow">LinkUp Discover</p>
                <h1 className="linkup-title mt-3">
                  {isSearchMode ? `Results for "${activeQuery}"` : "Discover"}
                </h1>
                <p className="linkup-subtitle max-w-3xl text-base leading-7">
                  Find people, sparks, hubs, opportunities, and what&apos;s moving
                  across LinkUp.
                </p>
              </div>
              <form
                onSubmit={handleSearchSubmit}
                className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div className="linkup-input-shell flex-1 rounded-full py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="linkup-input"
                    placeholder="Search people, sparks, hubs, market, work..."
                    aria-label="Discover search"
                  />
                </div>
                <button type="submit" className="linkup-btn-primary min-h-[44px] shrink-0 px-6">
                  Search
                </button>
              </form>
            </div>
          </header>

          {dataWarning ? (
            <p className="linkup-alert-warning" role="status">
              {dataWarning}
            </p>
          ) : null}

          {searchError ? (
            <p className="linkup-alert-warning" role="status">
              {searchError}
            </p>
          ) : null}

          <div className="linkup-panel p-3 sm:p-3">
            <div className="linkup-chip-row">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                      isActive
                        ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                        : "border border-slate-200/90 bg-white text-slate-700 hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200 dark:hover:bg-brand-primary/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="min-w-0">{renderTabContent()}</div>

            <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
              <LocalPulseCard country={currentUser?.country} />

              {!isSearchMode ? (
                <div className="linkup-panel p-5">
                  <p className="linkup-eyebrow">Trending Tags</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    Topics on LinkUp
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {discover.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          router.push(`/explore?q=${encodeURIComponent(tag)}`)
                        }
                        className="rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-300 dark:hover:bg-brand-primary/10"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isSearchMode ? (
                <div className="linkup-panel p-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Pulse snapshot
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {discover.sparks.length} trending spark
                    {discover.sparks.length === 1 ? "" : "s"} · {discover.hubs.length}{" "}
                    active hub{discover.hubs.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sparks")}
                    className="mt-4 text-sm font-semibold text-brand-primary dark:text-brand-secondary"
                  >
                    View sparks →
                  </button>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
