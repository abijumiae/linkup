"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Bell,
  CalendarDays,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { fetchExplorePosts, searchAll, SearchUser } from "@/src/lib/discovery";
import { FeedPost } from "@/src/lib/posts";
import { exploreTrendingTags } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import FeedPostCard from "./FeedPostCard";
import SearchUserCard from "./SearchUserCard";

type ExploreTab =
  | "posts"
  | "people"
  | "groups"
  | "marketplace"
  | "jobs"
  | "events";

const tabs: { id: ExploreTab; label: string; icon: typeof TrendingUp }[] = [
  { id: "posts", label: "Top Posts", icon: TrendingUp },
  { id: "people", label: "People", icon: Users },
  { id: "groups", label: "Hubs", icon: Users },
  { id: "marketplace", label: "Market", icon: ShoppingBag },
  { id: "jobs", label: "Work", icon: Briefcase },
  { id: "events", label: "Happenings", icon: CalendarDays },
];

function DiscoveryHub({
  title,
  description,
  href,
  cta,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-slate-900/60">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
      >
        {cta}
      </Link>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-slate-900/60">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Bell className="h-5 w-5" />
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}

export default function ExplorePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const currentUserId = getCurrentUser()?.id ?? null;

  const [searchInput, setSearchInput] = useState(queryParam);
  const [activeQuery, setActiveQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<ExploreTab>("posts");
  const [explorePosts, setExplorePosts] = useState<FeedPost[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [searchPosts, setSearchPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExplore = useCallback(async () => {
    try {
      const posts = await fetchExplorePosts();
      setExplorePosts(posts);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load explore posts. Please try again.");
    }
  }, [router]);

  const loadSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchUsers([]);
        setSearchPosts([]);
        await loadExplore();
        return;
      }

      try {
        const results = await searchAll(query);
        setSearchUsers(results.users);
        setSearchPosts(results.posts);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Unable to search. Please try again.");
      }
    },
    [loadExplore, router],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setError(null);

      if (queryParam.trim()) {
        await loadSearch(queryParam);
        setActiveTab("posts");
      } else {
        await loadExplore();
      }

      setIsLoading(false);
    }

    void init();
  }, [queryParam, loadExplore, loadSearch]);

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

  function renderTabContent() {
    if (activeTab === "posts") {
      const posts = isSearchMode ? searchPosts : explorePosts;

      if (posts.length === 0) {
        return (
          <EmptyPanel
            message={
              isSearchMode
                ? "No posts found for this search."
                : "No posts yet. Be the first to share something on the home feed."
            }
          />
        );
      }

      return (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      );
    }

    if (activeTab === "people") {
      if (!isSearchMode) {
        return (
          <DiscoveryHub
            title="Find people on LinkUp"
            description="Search by name, username, or email to discover creators and professionals in the community."
            href="/explore"
            cta="Use search above"
            icon={Users}
          />
        );
      }

      if (searchUsers.length === 0) {
        return <EmptyPanel message="No users found." />;
      }

      return (
        <div className="space-y-3">
          {searchUsers.map((user) => (
            <SearchUserCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      );
    }

    if (activeTab === "groups") {
      return (
        <DiscoveryHub
          title="Explore hubs"
          description="Join communities, collaborate with others, and discover hubs that match your interests."
          href="/groups"
          cta="Browse hubs"
          icon={Users}
        />
      );
    }

    if (activeTab === "marketplace") {
      const href = isSearchMode
        ? `/marketplace?q=${encodeURIComponent(activeQuery)}`
        : "/marketplace";
      return (
        <DiscoveryHub
          title="Browse market"
          description={
            isSearchMode
              ? `Continue searching "${activeQuery}" in market listings.`
              : "Find services, templates, and products shared by the community."
          }
          href={href}
          cta={isSearchMode ? "Search market" : "Open market"}
          icon={ShoppingBag}
        />
      );
    }

    if (activeTab === "jobs") {
      const href = isSearchMode
        ? `/jobs?q=${encodeURIComponent(activeQuery)}`
        : "/jobs";
      return (
        <DiscoveryHub
          title="Discover work"
          description={
            isSearchMode
              ? `Continue searching "${activeQuery}" in work opportunities.`
              : "Explore open roles and opportunities posted by LinkUp members."
          }
          href={href}
          cta={isSearchMode ? "Search work" : "Open work"}
          icon={Briefcase}
        />
      );
    }

    const href = isSearchMode
      ? `/events?q=${encodeURIComponent(activeQuery)}`
      : "/events";
    return (
      <DiscoveryHub
        title="Find happenings"
        description={
          isSearchMode
            ? `Continue searching "${activeQuery}" in upcoming happenings.`
            : "See what's happening in the community and connect with people near you."
        }
        href={href}
        cta={isSearchMode ? "Search happenings" : "Open happenings"}
        icon={CalendarDays}
      />
    );
  }

  if (isLoading) {
    return <AuthLoadingScreen message="Loading explore..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                  Explore
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                  {isSearchMode
                    ? `Results for "${activeQuery}"`
                    : "Discover content, people, and communities"}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Search across LinkUp or browse trending posts and discovery
                  hubs.
                </p>
              </div>
              <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Search people and posts..."
                />
              </form>
            </div>
          </header>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-md shadow-violet-600/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section>{renderTabContent()}</section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                  Trending
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Hot topics
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {exploreTrendingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const term = tag.replace("#", "");
                        router.push(`/explore?q=${encodeURIComponent(term)}`);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {!isSearchMode && explorePosts.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Latest posts
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {explorePosts.length} public posts in explore right now.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("posts")}
                    className="mt-4 text-sm font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    View top posts →
                  </button>
                </div>
              ) : null}

              {isSearchMode && searchUsers.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Suggested people
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {searchUsers.length} user
                    {searchUsers.length === 1 ? "" : "s"} matched your search.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("people")}
                    className="mt-4 text-sm font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    View people →
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
