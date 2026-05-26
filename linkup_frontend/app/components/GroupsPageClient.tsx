"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, X } from "lucide-react";
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

export default function GroupsPageClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionGroupId, setActionGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      setError("Unable to load groups. Please try again.");
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
      setError(
        err instanceof ApiError ? err.message : "Unable to join group.",
      );
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
      setError(
        err instanceof ApiError ? err.message : "Unable to leave group.",
      );
    } finally {
      setActionGroupId(null);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await createGroup({
        name: createName.trim(),
        description: createDescription.trim(),
      });
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
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create group.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const myGroups = groups.filter((group) => group.isMember);
  const discoverGroups = groups.filter((group) => !group.isMember);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                Groups
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Gather your communities in one place
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Manage your communities, discover new groups, and launch your
                own premium space.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
            >
              <Plus className="h-4 w-4" />
              Create group
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                    My groups
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    Your communities
                  </h2>
                </div>
                <Sparkles className="h-5 w-5 text-violet-300" />
              </div>
              <div className="mt-6 grid gap-4">
                {myGroups.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You have not joined any groups yet.
                  </p>
                ) : (
                  myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      isLoading={actionGroupId === group.id}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                    Discover
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    Groups to join
                  </h2>
                </div>
                <span className="rounded-full bg-violet-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                  All groups
                </span>
              </div>
              <div className="mt-6 grid gap-4">
                {discoverGroups.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No other groups to discover right now.
                  </p>
                ) : (
                  discoverGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      isLoading={actionGroupId === group.id}
                    />
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create group</h2>
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
                  Group name
                </label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                  placeholder="e.g. Design Creators"
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
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
                  placeholder="What is this group about?"
                />
              </div>
              {createError && (
                <p className="text-sm text-red-600 dark:text-red-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create group"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
