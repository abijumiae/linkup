"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  Briefcase,
  CircleDot,
  Heart,
  MessageCircle,
  PenLine,
  Users,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/AuthProvider";
import { formatTimeAgo } from "@/src/lib/posts";
import {
  fetchMyPostsSafe,
  fetchUserProfile,
  fetchUserProfileSafe,
  ProfileUser,
  updateUserProfile,
  UpdateProfilePayload,
  UserPost,
} from "@/src/lib/users";
import { fetchUserMoments } from "@/src/lib/moments";
import ProfileAboutSection from "./profile/ProfileAboutSection";
import ProfileCompletionCard from "./profile/ProfileCompletionCard";
import ProfileEditModal from "./profile/ProfileEditModal";
import { ProfileEditFocus } from "./ProfileEditForm";
import ProfileEmptyState from "./profile/ProfileEmptyState";
import ProfileHeader from "./profile/ProfileHeader";
import ProfileTabs, { ProfileTab } from "./profile/ProfileTabs";
import {
  ProfileHeaderSkeleton,
  ProfileTabsContentSkeleton,
  ProfileTabsSkeleton,
} from "./profile/ProfileSkeleton";

export default function ProfilePageClient() {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFocus, setEditFocus] = useState<ProfileEditFocus>("all");
  const [activeTab, setActiveTab] = useState<ProfileTab>("Sparks");
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasActiveMoment, setHasActiveMoment] = useState(false);

  const handleAuthFailure = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const loadProfile = useCallback(async () => {
    setWarning(null);

    try {
      const { user, warning: profileWarning } = await fetchUserProfileSafe();
      const [posts, moments] = await Promise.all([
        fetchMyPostsSafe(),
        fetchUserMoments(user.id).catch(() => []),
      ]);

      setProfileUser(user);
      setUserPosts(posts);
      setHasActiveMoment(moments.length > 0);
      setUser(user);
      setWarning(profileWarning);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      setWarning("Profile data is warming up.");
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
      setEditFocus("all");
      setSuccess("Your LinkUp Card has been updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      if (err instanceof ApiError) {
        throw err;
      }

      throw new ApiError(
        "Could not update your LinkUp Card. Please try again.",
        500,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openEditModal(focus: ProfileEditFocus) {
    setSuccess(null);
    setEditFocus(focus);
    setIsEditing(true);
  }

  function handleShareProfile() {
    window.alert("Share Profile is coming soon.");
  }

  function renderTabContent() {
    if (activeTab === "Sparks") {
      if (userPosts.length === 0) {
        return (
          <ProfileEmptyState
            icon={PenLine}
            title="No Sparks yet"
            description="Drop your first Spark on Pulse and it will show up here on your profile."
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
              className="linkup-panel p-5 transition hover:border-brand-primary/20"
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

    if (activeTab === "Moments") {
      return (
        <ProfileEmptyState
          icon={CircleDot}
          title="No Moments yet"
          description="Share a Moment from Pulse and your 24-hour stories will appear here."
          actionLabel="Go to Pulse"
          actionHref="/home"
        />
      );
    }

    if (activeTab === "Hubs") {
      return (
        <ProfileEmptyState
          icon={Users}
          title="No Hubs yet"
          description="Hubs you join or create will appear here so you can quickly access your communities."
          actionLabel="Explore Hubs"
          actionHref="/groups"
        />
      );
    }

    if (activeTab === "Work") {
      return (
        <ProfileEmptyState
          icon={Briefcase}
          title="No Work Drops yet"
          description="Jobs and work opportunities you post will show up here on your profile."
          actionLabel="Browse Work"
          actionHref="/jobs"
        />
      );
    }

    return (
      <ProfileEmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        description="Sparks and content you save for later will be collected here for easy access."
        actionLabel="Discover"
        actionHref="/explore"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="linkup-page">
        <div className="linkup-container max-w-4xl space-y-6">
          <header className="linkup-panel p-6 sm:p-7">
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="mt-3 h-8 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
          </header>
          <ProfileHeaderSkeleton />
          <div className="linkup-panel h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
          <ProfileTabsSkeleton />
          <ProfileTabsContentSkeleton />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="linkup-panel max-w-md p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Profile data is warming up.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadProfile();
            }}
            className="linkup-btn-primary mt-4 min-h-[44px]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container max-w-4xl space-y-6">
        <header className="linkup-panel p-6 sm:p-7">
          <p className="linkup-eyebrow">LinkUp</p>
          <h1 className="linkup-title mt-3">Profile</h1>
          <p className="linkup-subtitle">
            Your LinkUp Card, network, and sparks in one place.
          </p>
        </header>

        {warning ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <ProfileHeader
          user={profileUser}
          isEditing={isEditing}
          hasActiveMoment={hasActiveMoment}
          onEditProfile={() => openEditModal("all")}
          onEditAvatar={() => openEditModal("avatar")}
          onEditCover={() => openEditModal("cover")}
          onShareProfile={handleShareProfile}
        />

        <ProfileCompletionCard user={profileUser} hasActiveMoment={hasActiveMoment} />

        <ProfileAboutSection user={profileUser} />

        <section className="space-y-4">
          <div>
            <p className="linkup-eyebrow">Activity</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              Your LinkUp presence
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sparks, moments, hubs, work, and saved content in one view.
            </p>
          </div>

          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {renderTabContent()}
        </section>
      </div>

      <ProfileEditModal
        user={profileUser}
        isOpen={isEditing}
        isSaving={isSaving}
        focus={editFocus}
        onClose={() => {
          setIsEditing(false);
          setEditFocus("all");
        }}
        onSubmit={handleProfileUpdate}
      />
    </div>
  );
}
