"use client";

import { FormEvent, useEffect, useState } from "react";
import { Globe, Link2, User, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { User as ProfileUser } from "@/src/lib/auth";
import { UpdateProfilePayload } from "@/src/lib/users";

type EditProfileModalProps = {
  user: ProfileUser;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateProfilePayload) => Promise<void>;
};

export default function EditProfileModal({
  user,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [country, setCountry] = useState(user.country ?? "");
  const [language, setLanguage] = useState(user.language ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setUsername(user.username);
      setCountry(user.country ?? "");
      setLanguage(user.language ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        username: username.trim(),
        country: country.trim() || undefined,
        language: language.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to update profile. Please try again.");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close edit profile"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSaving}
      />
      <div className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Edit profile</h2>
            <p className="mt-2 text-sm text-slate-400">
              Update your public details. Email, role, and verification are managed separately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 bg-slate-950/80 p-2 text-slate-300 transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <label className="block space-y-3">
            <span className="text-sm font-medium text-slate-300">Full name</span>
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
              <User className="h-4 w-4 text-violet-300" />
              <input
                className="w-full bg-transparent text-slate-100 outline-none"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </label>

          <label className="block space-y-3">
            <span className="text-sm font-medium text-slate-300">Username</span>
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
              <User className="h-4 w-4 text-violet-300" />
              <input
                className="w-full bg-transparent text-slate-100 outline-none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium text-slate-300">Country</span>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                <Globe className="h-4 w-4 text-violet-300" />
                <input
                  className="w-full bg-transparent text-slate-100 outline-none"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  disabled={isSaving}
                />
              </div>
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium text-slate-300">Language</span>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                <Globe className="h-4 w-4 text-violet-300" />
                <input
                  className="w-full bg-transparent text-slate-100 outline-none"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  disabled={isSaving}
                />
              </div>
            </label>
          </div>

          <label className="block space-y-3">
            <span className="text-sm font-medium text-slate-300">Avatar URL</span>
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
              <Link2 className="h-4 w-4 text-violet-300" />
              <input
                className="w-full bg-transparent text-slate-100 outline-none"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
                type="url"
                disabled={isSaving}
              />
            </div>
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
