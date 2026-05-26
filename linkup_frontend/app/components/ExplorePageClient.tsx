"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, TrendingUp, Users } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { fetchExplorePosts, searchAll, SearchUser } from "@/src/lib/discovery";
import { FeedPost } from "@/src/lib/posts";
import { exploreTrendingTags } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import FeedPostCard from "./FeedPostCard";
import SearchUserCard from "./SearchUserCard";

export default function ExplorePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const currentUserId = getCurrentUser()?.id ?? null;

  const [searchInput, setSearchInput] = useState(queryParam);
  const [activeQuery, setActiveQuery] = useState(queryParam);
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
  const displayPosts = isSearchMode ? searchPosts : explorePosts;

  if (isLoading) {
    return <AuthLoadingScreen message="Loading explore..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                  Explore
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                  {isSearchMode
                    ? `Results for "${activeQuery}"`
                    : "Discover new content, creators, and communities"}
                </h1>
              </div>
              <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Search people and posts..."
                />
              </form>
            </div>
          </header>

          {error ? <p className="text-sm text-red-500 dark:text-red-400">{error}</p> : null}

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="space-y-6">
              {isSearchMode ? (
                <>
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-violet-300" />
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">People</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {searchUsers.length === 0 ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">No users found.</p>
                      ) : (
                        searchUsers.map((user) => (
                          <SearchUserCard
                            key={user.id}
                            user={user}
                            currentUserId={currentUserId}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Posts</h2>
                    {searchPosts.length === 0 ? (
                      <p className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400">
                        No posts found.
                      </p>
                    ) : (
                      searchPosts.map((post) => (
                        <FeedPostCard
                          key={post.id}
                          post={post}
                          currentUserId={currentUserId}
                        />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-violet-300" />
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Trending & latest posts
                    </h2>
                  </div>
                  {displayPosts.length === 0 ? (
                    <p className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400">
                      No public posts yet. Be the first to share something on the home feed.
                    </p>
                  ) : (
                    displayPosts.map((post) => (
                      <FeedPostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUserId}
                      />
                    ))
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
                <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                  Trending
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Hot hashtags</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {exploreTrendingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const term = tag.replace("#", "");
                        router.push(`/explore?q=${encodeURIComponent(term)}`);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
