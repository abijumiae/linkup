"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Image, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createGroup,
  fetchGroups,
  Group,
  joinGroup,
  leaveGroup,
} from "@/src/lib/groups";
import AuthLoadingScreen from "./AuthLoadingScreen";
import GroupCard from "./GroupCard";
import HubChallengeCard from "./linkup/HubChallengeCard";

function HubsEmptyState({
  title,
  description,
  showCreateButton,
  onCreate,
}: {
  title: string;
  description: string;
  showCreateButton?: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-brand-dark/60 sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
        <Users className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {showCreateButton && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
        >
          <Plus className="h-4 w-4" />
          Create Hub
        </button>
      ) : null}
    </div>
  );
}

export default function GroupsPageClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionGroupId, setActionGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createCoverImage, setCreateCoverImage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "joined" | "discover">(
    "all",
  );

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchGroups();
      setGroups(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load hubs. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadGroups();
      setIsLoading(false);
    }
    void init();
  }, [loadGroups]);

  const updateGroupInList = (updated: Group) => {
    setGroups((prev) =>
      prev.map((group) => (group.id === updated.id ? { ...group, ...updated } : group)),
    );
  };

  const handleJoin = async (groupId: string) => {
    setActionGroupId(groupId);
    try {
      const updated = await joinGroup(groupId);
      updateGroupInList(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to join hub.");
    } finally {
      setActionGroupId(null);
    }
  };

  const handleLeave = async (groupId: string) => {
    setActionGroupId(groupId);
    try {
      const updated = await leaveGroup(groupId);
      updateGroupInList(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to leave hub.");
    } finally {
      setActionGroupId(null);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const payload = {
        name: createName.trim(),
        description: createDescription.trim(),
        coverImage: createCoverImage.trim() || undefined,
      };

      const created = await createGroup(payload);
      setGroups((prev) => [
        {
          id: created.id,
          name: created.name,
          description: created.description,
          coverImage: created.coverImage,
          ownerId: created.ownerId,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          membersCount: created.membersCount,
          isMember: true,
          isOwner: true,
        },
        ...prev.filter((group) => group.id !== created.id),
      ]);
      setShowCreateModal(false);
      setCreateName("");
      setCreateDescription("");
      setCreateCategory("");
      setCreateCoverImage("");
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create hub.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesGroup = (group: Group) =>
    !normalizedQuery ||
    group.name.toLowerCase().includes(normalizedQuery) ||
    group.description.toLowerCase().includes(normalizedQuery);

  const myGroups = groups.filter((group) => group.isMember);
  const discoverGroups = groups.filter((group) => !group.isMember);
  const searchedGroups = groups.filter(matchesGroup);
  const filteredGroups =
    activeFilter === "joined"
      ? searchedGroups.filter((group) => group.isMember)
      : activeFilter === "discover"
        ? searchedGroups.filter((group) => !group.isMember)
        : searchedGroups;

  const trendingHubs = [...groups]
    .sort((a, b) => (b.membersCount ?? 0) - (a.membersCount ?? 0))
    .slice(0, 3);

  if (isLoading) {
    return <AuthLoadingScreen message="Loading hubs..." />;
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="linkup-panel mb-8 p-6 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="linkup-eyebrow">LinkUp Hubs</p>
              <h1 className="linkup-title mt-3">Hubs</h1>
              <p className="linkup-subtitle">
                Build communities around people, ideas, and opportunities.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="linkup-input-shell w-full sm:w-64">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search hubs..."
                  className="linkup-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="linkup-btn-primary"
              >
                <Plus className="h-4 w-4" />
                Create Hub
              </button>
            </div>
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        <HubChallengeCard />

        {trendingHubs.length > 0 ? (
          <section className="linkup-panel mb-6 p-5 sm:p-6">
            <p className="linkup-eyebrow">Active Hubs</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              Trending in your network
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {trendingHubs.map((hub) => (
                <div
                  key={hub.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-brand-dark/60"
                >
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {hub.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {hub.membersCount ?? 0} members
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-brand-primary dark:text-brand-secondary/80">
                Communities
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                Find your next hub
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {myGroups.length} joined · {discoverGroups.length} to discover
              </span>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { id: "all", label: "All hubs" },
              { id: "joined", label: "Joined" },
              { id: "discover", label: "Discover" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id as typeof activeFilter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeFilter === chip.id
                    ? "border-brand-primary/50 bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <HubsEmptyState
              title="No hubs yet"
              description="Create the first hub and start building your community."
              showCreateButton
              onCreate={() => setShowCreateModal(true)}
            />
          ) : filteredGroups.length === 0 ? (
            <HubsEmptyState
              title="No hubs found"
              description={
                activeFilter === "joined"
                  ? "You have not joined any hubs yet. Discover one or create your own."
                  : activeFilter === "discover"
                    ? "No hubs available to discover right now."
                    : "No hubs match your search."
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  isLoading={actionGroupId === group.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Create Hub
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                  Hub name
                </label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
                  placeholder="e.g. Design Creators Hub"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                  Cover image URL (optional)
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-brand-dark">
                  <Image className="h-4 w-4 text-slate-500" />
                  <input
                    value={createCoverImage}
                    onChange={(e) => setCreateCoverImage(e.target.value)}
                    type="url"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Used as the banner image on your hub card.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                  Category (optional)
                </label>
                <input
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
                  placeholder="e.g. Design, Startups, Tech"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                  Description
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  required
                  minLength={1}
                  maxLength={500}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
                  placeholder="What is this hub about?"
                />
              </div>
              {createError && (
                <p className="text-sm text-red-600 dark:text-red-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create Hub"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
