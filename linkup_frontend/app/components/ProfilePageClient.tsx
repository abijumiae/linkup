"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
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
import EditProfileModal from "./EditProfileModal";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";

export default function ProfilePageClient() {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
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
      setIsEditOpen(false);
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

  if (isLoading) {
    return <AuthLoadingScreen message="Loading your profile..." />;
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm text-rose-200">
          {error ?? "Profile unavailable."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {success ? (
          <div className="mb-6 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="h-52 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-sky-500/10 to-cyan-400/10 p-6">
            <div className="flex h-full flex-col justify-end">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-200/80">LinkUp profile</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{profileUser.name}</h1>
            </div>
          </div>
          <div className="-mt-16">
            <ProfileHeader
              user={profileUser}
              followers={profileUser.followersCount}
              following={profileUser.followingCount}
              posts={profileUser.postsCount}
              onEditProfile={() => setIsEditOpen(true)}
            />
          </div>
        </section>

        <div className="mt-8 space-y-6">
          <ProfileTabs />
          <section className="space-y-4">
            {userPosts.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-8 text-center shadow-lg shadow-slate-950/10">
                <p className="text-sm text-slate-400">You have not posted anything yet.</p>
                <Link
                  href="/home"
                  className="mt-4 inline-flex text-sm font-semibold text-violet-300 transition hover:text-violet-200"
                >
                  Create your first post
                </Link>
              </div>
            ) : (
              userPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-lg shadow-slate-950/10"
                >
                  <p className="text-sm uppercase tracking-[0.28em] text-violet-300/80">Post</p>
                  <p className="mt-3 text-xs text-slate-500">{formatTimeAgo(post.createdAt)}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{post.content}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
                      <Heart className="h-4 w-4 text-pink-400" />
                      {post.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
                      <MessageCircle className="h-4 w-4 text-sky-300" />
                      {post.commentCount}
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </div>

      <EditProfileModal
        user={profileUser}
        isOpen={isEditOpen}
        isSaving={isSaving}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleProfileUpdate}
      />
    </div>
  );
}
