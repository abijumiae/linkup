"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  Film,
  Heart,
  MessageCircle,
  PenLine,
  Users,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/AuthProvider";
import { formatTimeAgo } from "@/src/lib/posts";
import {
  fetchMyPosts,
  fetchUserProfile,
  ProfileUser,
  updateUserProfile,
  UpdateProfilePayload,
  UserPost,
} from "@/src/lib/users";
import AuthLoadingScreen from "./AuthLoadingScreen";
import ProfileEditForm from "./ProfileEditForm";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs, { ProfileTab } from "./ProfileTabs";

function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: typeof PenLine;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-brand-dark/60 sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function ProfilePageClient() {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Sparks");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuthFailure = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const loadProfile = useCallback(async () => {
    setError(null);

    try {
      const [user, posts] = await Promise.all([
        fetchUserProfile(),
        fetchMyPosts(),
      ]);
      setProfileUser(user);
      setUserPosts(posts);
      setUser(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      setError("Unable to load your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthFailure, setUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleProfileUpdate(payload: UpdateProfilePayload) {
    setIsSaving(true);
    setSuccess(null);

    try {
      await updateUserProfile(payload);
      const user = await fetchUserProfile();
      setProfileUser(user);
      setUser(user);
      setIsEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      if (err instanceof ApiError) {
        throw err;
      }

      throw new ApiError("Unable to update profile. Please try again.", 500);
    } finally {
      setIsSaving(false);
    }
  }

  function renderTabContent() {
    if (activeTab === "Sparks") {
      if (userPosts.length === 0) {
        return (
          <ProfileEmptyState
            icon={PenLine}
            title="No sparks yet"
            description="Drop your first spark on Pulse and it will show up here on your profile."
            actionLabel="Drop Spark"
            actionHref="/home"
          />
        );
      }

      return (
        <div className="space-y-4">
          {userPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary dark:text-brand-secondary">
                  Spark
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatTimeAgo(post.createdAt)}
                </p>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {post.content}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 dark:bg-white/5">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Boost {post.likeCount}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 dark:bg-white/5">
                  <MessageCircle className="h-4 w-4 text-brand-secondary" />
                  Reply {post.commentCount}
                </span>
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (activeTab === "Reels") {
      return (
        <ProfileEmptyState
          icon={Film}
          title="No reels yet"
          description="Short-form videos you publish will show up here once reels are available on your account."
        />
      );
    }

    if (activeTab === "Hubs") {
      return (
        <ProfileEmptyState
          icon={Users}
          title="No hubs yet"
          description="Hubs you join or create will appear here so you can quickly access your communities."
          actionLabel="Explore hubs"
          actionHref="/groups"
        />
      );
    }

    return (
      <ProfileEmptyState
        icon={Bookmark}
        title="No saved items yet"
        description="Sparks and content you save for later will be collected here for easy access."
        actionLabel="Discover"
        actionHref="/explore"
      />
    );
  }

  if (isLoading) {
    return <AuthLoadingScreen message="Loading your profile..." />;
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm text-rose-700 dark:text-rose-200">
          {error ?? "Profile unavailable."}
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container max-w-4xl">
        <header className="linkup-panel mb-6 p-6 sm:p-7">
          <p className="linkup-eyebrow">LinkUp</p>
          <h1 className="linkup-title mt-3">Profile</h1>
          <p className="linkup-subtitle">
            Your LinkUp Card, network, and sparks in one place.
          </p>
        </header>

        {success ? (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <ProfileHeader
          user={profileUser}
          followers={profileUser.followersCount}
          following={profileUser.followingCount}
          posts={profileUser.postsCount}
          isEditing={isEditing}
          onEditProfile={() => {
            setSuccess(null);
            setIsEditing(true);
          }}
        />

        {isEditing ? (
          <div className="mt-6">
            <ProfileEditForm
              user={profileUser}
              isSaving={isSaving}
              onCancel={() => setIsEditing(false)}
              onSubmit={handleProfileUpdate}
            />
          </div>
        ) : null}

        <section className="mt-8 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary dark:text-brand-secondary/80">
                My Sparks
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                What you&apos;ve dropped
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {userPosts.length === 0
                  ? "You haven't dropped any sparks yet."
                  : `${userPosts.length} spark${userPosts.length === 1 ? "" : "s"} on your profile.`}
              </p>
            </div>
          </div>

          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {renderTabContent()}
        </section>
      </div>
    </div>
  );
}
