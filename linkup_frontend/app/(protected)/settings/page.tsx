"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Eye,
  Globe,
  LogOut,
  Mail,
  Shield,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "@/src/lib/AuthProvider";
import { ApiError } from "@/src/lib/api";
import {
  COUNTRIES,
  formatAccountType,
  formatLanguageLabel,
  LANGUAGES,
} from "@/src/lib/profileOptions";
import {
  fetchUserProfile,
  ProfileUser,
  updateUserProfile,
  UpdateProfilePayload,
} from "@/src/lib/users";
import SettingsSection from "../../components/SettingsSection";
import { ThemeToggle } from "../../components/ThemeToggle";

type Visibility = "PUBLIC" | "PRIVATE";
type MessagePolicy = "EVERYONE" | "FOLLOWERS" | "NO_ONE";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-label={checked ? `Disable ${label}` : `Enable ${label}`}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
          checked
            ? "border-violet-500/40 bg-violet-600"
            : "border-slate-300 bg-slate-200 dark:border-white/20 dark:bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setUser, logout } = useAuth();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable account/profile fields supported by updateUserProfile
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [language, setLanguage] = useState("en");

  // UI-only preferences (no backend wiring requested / unknown support)
  const [profession, setProfession] = useState("");
  const [interests, setInterests] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [allowMessages, setAllowMessages] = useState<MessagePolicy>("EVERYONE");
  const [showCountry, setShowCountry] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyLikesComments, setNotifyLikesComments] = useState(true);
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(false);

  const handleAuthFailure = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const load = useCallback(async () => {
    setError(null);
    setSuccess(null);

    try {
      const user = await fetchUserProfile();
      setProfileUser(user);
      setUser(user);

      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setCountry(user.country ?? "United Arab Emirates");
      setLanguage(user.language ?? "en");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      setError("Unable to load settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthFailure, setUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const interestsList = useMemo(() => {
    return interests
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
  }, [interests]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const payload: UpdateProfilePayload = {
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim() || undefined,
      country: country.trim() || undefined,
      language: language.trim() || undefined,
    };

    try {
      await updateUserProfile(payload);
      const updated = await fetchUserProfile();
      setProfileUser(updated);
      setUser(updated);
      setSuccess("Settings saved successfully.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to save settings. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-200">
            {error ?? "Settings unavailable."}
          </div>
        </div>
      </div>
    );
  }

  const inputShell =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50";
  const inputClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";
  const selectClass = "w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                Settings
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Account preferences
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Manage your account details, privacy controls, notifications, and appearance in one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSave}>
          <SettingsSection
            title="Account Settings"
            description="Update your core account information. Email and account type are read-only for now."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Full name</span>
                <div className={inputShell}>
                  <User className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Email
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span className="break-all">{profileUser.email}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Email changes aren’t available yet.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Account type
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatAccountType(profileUser.accountType)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Country</span>
                <div className={inputShell}>
                  <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                  <select
                    className={selectClass}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
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
                    onChange={(e) => setLanguage(e.target.value)}
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
          </SettingsSection>

          <SettingsSection
            title="Profile Preferences"
            description="Customize how your profile appears. Only bio is saved right now."
          >
            <label className="block space-y-2">
              <span className={labelClass}>Bio / About</span>
              <div className={`${inputShell} items-start py-3`}>
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself."
                  disabled={isSaving}
                  rows={4}
                />
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Profession / Title</span>
                <div className={inputShell}>
                  <User className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    className={inputClass}
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Product Designer"
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  UI-ready (not saved yet).
                </p>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>Interests / Tags</span>
                <div className={inputShell}>
                  <Tag className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    className={inputClass}
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="design, startups, ai"
                    disabled={isSaving}
                  />
                </div>
                {interestsList.length ? (
                  <div className="flex flex-wrap gap-2">
                    {interestsList.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  UI-ready (not saved yet).
                </p>
              </label>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Privacy Settings"
            description="These controls are UI-only for now until the backend exposes privacy preferences."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Profile visibility</span>
                <div className={inputShell}>
                  <Eye className="h-4 w-4 shrink-0 text-slate-500" />
                  <select
                    className={selectClass}
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    disabled={isSaving}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>Allow messages</span>
                <div className={inputShell}>
                  <Shield className="h-4 w-4 shrink-0 text-slate-500" />
                  <select
                    className={selectClass}
                    value={allowMessages}
                    onChange={(e) =>
                      setAllowMessages(e.target.value as MessagePolicy)
                    }
                    disabled={isSaving}
                  >
                    <option value="EVERYONE">Everyone</option>
                    <option value="FOLLOWERS">Followers only</option>
                    <option value="NO_ONE">No one</option>
                  </select>
                </div>
              </label>
            </div>

            <ToggleRow
              label="Show country on profile"
              description="Control whether your country is visible on your public profile."
              checked={showCountry}
              onChange={setShowCountry}
              disabled={isSaving}
            />
          </SettingsSection>

          <SettingsSection
            title="Notification Settings"
            description="UI-only toggles (not connected yet)."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="New message notifications"
                description="Get notified when someone sends you a message."
                checked={notifyMessages}
                onChange={setNotifyMessages}
                disabled={isSaving}
              />
              <ToggleRow
                label="Like/comment notifications"
                description="Alerts when someone likes or comments on your content."
                checked={notifyLikesComments}
                onChange={setNotifyLikesComments}
                disabled={isSaving}
              />
              <ToggleRow
                label="Follow notifications"
                description="Updates when someone follows you."
                checked={notifyFollows}
                onChange={setNotifyFollows}
                disabled={isSaving}
              />
              <ToggleRow
                label="Event/job updates"
                description="Occasional updates about relevant events and job posts."
                checked={notifyUpdates}
                onChange={setNotifyUpdates}
                disabled={isSaving}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Appearance"
            description="Theme preferences for LinkUp."
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Theme
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Toggle between light and dark mode.
                  </p>
                </div>
                <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                  <ThemeToggle />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Current language label: {formatLanguageLabel(profileUser.language)}
              </p>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Danger Zone"
            description="Logout or manage account removal. Destructive actions require backend support."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Logout
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Sign out of your account on this device.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">
                  Delete account
                </p>
                <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-200/80">
                  This action is permanent. Account deletion isn’t available yet.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </button>
              </div>
            </div>
          </SettingsSection>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Bell className="h-4 w-4" />
              Privacy and notification preferences are UI-only right now.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
