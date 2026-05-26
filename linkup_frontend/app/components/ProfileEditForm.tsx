"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileText, Globe, Save, User, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { User as AuthUser } from "@/src/lib/auth";
import { COUNTRIES, LANGUAGES } from "@/src/lib/profileOptions";
import { UpdateProfilePayload } from "@/src/lib/users";

type ProfileEditFormProps = {
  user: AuthUser;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateProfilePayload) => Promise<void>;
};

export default function ProfileEditForm({
  user,
  isSaving,
  onCancel,
  onSubmit,
}: ProfileEditFormProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? "");
  const [country, setCountry] = useState(user.country ?? "United Arab Emirates");
  const [language, setLanguage] = useState(user.language ?? "en");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
    setBio(user.bio ?? "");
    setCountry(user.country ?? "United Arab Emirates");
    setLanguage(user.language ?? "en");
    setError(null);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        language: language.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to update profile. Please try again.");
      }
    }
  }

  const inputShell =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50";
  const inputClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";
  const selectClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500 dark:text-violet-300">
            Edit profile
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            Update your public details
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Email, role, and verification are managed separately.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClass}>Full name</span>
            <div className={inputShell}>
              <User className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className={labelClass}>Username</span>
            <div className={inputShell}>
              <User className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                className={inputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </label>
        </div>

        <label className="block space-y-2">
          <span className={labelClass}>Bio / About</span>
          <div className={`${inputShell} items-start py-3`}>
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell people about yourself, your interests, or what you do."
              disabled={isSaving}
              rows={4}
            />
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClass}>Country</span>
            <div className={inputShell}>
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
              <select
                className={selectClass}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={isSaving}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block space-y-2">
            <span className={labelClass}>Language</span>
            <div className={inputShell}>
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
              <select
                className={selectClass}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={isSaving}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
