"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FileText, Globe, Save, User, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { AccountType, User as AuthUser } from "@/src/lib/auth";
import LinkUpCardAppearanceEditor from "@/src/components/profile/LinkUpCardAppearanceEditor";
import { ACCOUNT_TYPES, COUNTRIES, LANGUAGES } from "@/src/lib/profileOptions";
import { UpdateProfilePayload } from "@/src/lib/users";

export type ProfileEditFocus = "all" | "avatar" | "cover";

type ProfileEditFormProps = {
  user: AuthUser;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateProfilePayload) => Promise<void>;
  variant?: "inline" | "modal";
  focus?: ProfileEditFocus;
};

export default function ProfileEditForm({
  user,
  isSaving,
  onCancel,
  onSubmit,
  variant = "inline",
  focus = "all",
}: ProfileEditFormProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? "");
  const [country, setCountry] = useState(user.country ?? "United Arab Emirates");
  const [language, setLanguage] = useState(user.language ?? "en");
  const [accountType, setAccountType] = useState<AccountType>(user.accountType);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(user.coverUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const mediaSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
    setBio(user.bio ?? "");
    setCountry(user.country ?? "United Arab Emirates");
    setLanguage(user.language ?? "en");
    setAccountType(user.accountType);
    setAvatarUrl(user.avatarUrl ?? "");
    setCoverUrl(user.coverUrl ?? "");
    setError(null);
  }, [user]);

  useEffect(() => {
    if (focus === "all" || !mediaSectionRef.current) {
      return;
    }
    mediaSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

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
        accountType,
        avatarUrl: avatarUrl.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not update your LinkUp Card. Please try again.");
      }
    }
  }

  const inputShell =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/70 dark:focus-within:border-brand-primary/50";
  const inputClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";
  const selectClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300";

  const shellClass =
    variant === "modal"
      ? ""
      : "rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20 sm:p-6";

  const showProfileFields = focus === "all";

  return (
    <section className={shellClass}>
      {variant === "inline" ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary dark:text-brand-secondary">
              Edit profile
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Update your LinkUp Card
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Refresh your LinkUp Avatar, Pulse Cover, and profile details.
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
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div ref={mediaSectionRef}>
          <LinkUpCardAppearanceEditor
            user={user}
            avatarUrl={avatarUrl}
            coverUrl={coverUrl}
            disabled={isSaving}
            onAvatarChange={setAvatarUrl}
            onCoverChange={setCoverUrl}
            onError={setError}
          />
        </div>

        {showProfileFields ? (
          <>
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
              <span className={labelClass}>Bio</span>
              <div className={`${inputShell} items-start py-3`}>
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Who you are, what you're building, and what you're open to connect for..."
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

            <label className="block space-y-2">
              <span className={labelClass}>Account type</span>
              <div className={inputShell}>
                <User className="h-4 w-4 shrink-0 text-slate-500" />
                <select
                  className={selectClass}
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value as AccountType)}
                  disabled={isSaving}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="linkup-btn-secondary min-h-[44px] px-5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="linkup-btn-primary min-h-[44px] px-5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save LinkUp Card"}
          </button>
        </div>
      </form>
    </section>
  );
}
