"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  Briefcase,
  CircleDot,
  PenLine,
  Users,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/AuthProvider";
import {
  FeedPost,
  fetchSavedPostsSafe,
  mapProfilePostToFeedPost,
} from "@/src/lib/posts";
import { useSocket } from "@/src/components/SocketProvider";
import {
  fetchMyPostsSafe,
  fetchUserProfile,
  fetchUserProfileSafe,
  ProfileUser,
  updateUserProfile,
  UpdateProfilePayload,
} from "@/src/lib/users";
import { fetchUserMoments } from "@/src/lib/moments";
import FeedPostCard from "./FeedPostCard";
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

function toPostAuthor(user: ProfileUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    accountType: user.accountType,
    isVerified: user.isVerified,
  };
}

export default function ProfilePageClient() {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const { socket } = useSocket();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFocus, setEditFocus] = useState<ProfileEditFocus>("all");
  const [activeTab, setActiveTab] = useState<ProfileTab>("Sparks");
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasActiveMoment, setHasActiveMoment] = useState(false);

  const currentUserId = profileUser?.id ?? null;
  const currentUserRole = profileUser?.role ?? null;

  const handleAuthFailure = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const loadProfile = useCallback(async () => {
    setWarning(null);

    try {
      const { user, warning: profileWarning } = await fetchUserProfileSafe();
      const author = toPostAuthor(user);
      const [posts, saved, moments] = await Promise.all([
        fetchMyPostsSafe(),
        fetchSavedPostsSafe(),
        fetchUserMoments(user.id).catch(() => []),
      ]);

      setProfileUser(user);
      setUserPosts(posts.map((post) => mapProfilePostToFeedPost(post, author)));
      setSavedPosts(saved);
      setHasActiveMoment(moments.length > 0);
      setUser(user);
      setWarning(profileWarning);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      setWarning("Could not load profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthFailure, setUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!socket || !currentUserId) {
      return;
    }

    socket.emit("join_pulse");

    const patchPostLists = (
      postId: string,
      patch: Partial<
        Pick<FeedPost, "content" | "imageUrl" | "videoUrl" | "updatedAt">
      >,
    ) => {
      const updater = (posts: FeedPost[]) =>
        posts.map((post) =>
          post.id === postId ? { ...post, ...patch } : post,
        );

      setUserPosts(updater);
      setSavedPosts(updater);
    };

    const removePostFromLists = (postId: string) => {
      setUserPosts((current) => {
        const hadOwnPost = current.some((post) => post.id === postId);
        if (hadOwnPost) {
          setProfileUser((user) =>
            user
              ? { ...user, postsCount: Math.max(0, user.postsCount - 1) }
              : user,
          );
        }
        return current.filter((post) => post.id !== postId);
      });
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
    };

    const onPostUpdated = (payload: {
      id?: string;
      content?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      updatedAt?: string;
    }) => {
      if (!payload.id) {
        return;
      }

      patchPostLists(payload.id, {
        content: payload.content,
        imageUrl:
          payload.imageUrl !== undefined ? payload.imageUrl : undefined,
        videoUrl:
          payload.videoUrl !== undefined ? payload.videoUrl : undefined,
        updatedAt: payload.updatedAt,
      });
    };

    const onPostDeleted = (payload: { id?: string }) => {
      if (!payload.id) {
        return;
      }
      removePostFromLists(payload.id);
    };

    const onPostUnsaved = (payload: { postId?: string; userId?: string }) => {
      if (!payload.postId || payload.userId !== currentUserId) {
        return;
      }
      setSavedPosts((current) =>
        current.filter((post) => post.id !== payload.postId),
      );
    };

    socket.on("post_updated", onPostUpdated);
    socket.on("post_deleted", onPostDeleted);
    socket.on("post_unsaved", onPostUnsaved);

    return () => {
      socket.off("post_updated", onPostUpdated);
      socket.off("post_deleted", onPostDeleted);
      socket.off("post_unsaved", onPostUnsaved);
    };
  }, [socket, currentUserId]);

  function handlePostUpdated(updated: FeedPost) {
    setUserPosts((current) =>
      current.map((post) => (post.id === updated.id ? updated : post)),
    );
    setSavedPosts((current) =>
      current.map((post) => (post.id === updated.id ? updated : post)),
    );
  }

  function handlePostDeleted(postId: string) {
    setUserPosts((current) => {
      const hadOwnPost = current.some((post) => post.id === postId);
      if (hadOwnPost) {
        setProfileUser((user) =>
          user
            ? { ...user, postsCount: Math.max(0, user.postsCount - 1) }
            : user,
        );
      }
      return current.filter((post) => post.id !== postId);
    });
    setSavedPosts((current) => current.filter((post) => post.id !== postId));
  }

  function handlePostUnsaved(postId: string) {
    setSavedPosts((current) => current.filter((post) => post.id !== postId));
  }

  async function handleProfileUpdate(payload: UpdateProfilePayload) {
    setIsSaving(true);
    setSuccess(null);

    try {
      await updateUserProfile(payload);
      const user = await fetchUserProfile();
      setProfileUser(user);
      setUser(user);
      const author = toPostAuthor(user);
      setUserPosts((current) =>
        current.map((post) => ({ ...post, author })),
      );
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

  function renderPostList(
    posts: FeedPost[],
    options?: { onUnsaved?: (postId: string) => void },
  ) {
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            pulseLabels
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
            onPostUnsaved={options?.onUnsaved}
          />
        ))}
      </div>
    );
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

      return renderPostList(userPosts);
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

    if (savedPosts.length === 0) {
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

    return renderPostList(savedPosts, { onUnsaved: handlePostUnsaved });
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
            Could not load profile data. Please try again.
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
