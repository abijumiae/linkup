"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Eye,
  Globe,
  LogOut,
  Mail,
  Scale,
  Shield,
  Tag,
  Trash2,
  User,
  Link2,
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
  fetchUserProfileSafe,
  ProfileUser,
  updateUserProfile,
  UpdateProfilePayload,
} from "@/src/lib/users";
import {
  getBrowserAlertStatus,
  isBrowserAlertsEnabled,
  requestBrowserAlertPermission,
  setBrowserAlertsEnabled,
  type BrowserAlertStatus,
} from "@/src/lib/browserNotifications";
import SettingsSection from "../../components/SettingsSection";
import SettingsPageSkeleton from "../../components/settings/SettingsSkeleton";
import { ThemeToggle } from "../../components/ThemeToggle";
import LinkUpCardAppearanceEditor from "@/src/components/profile/LinkUpCardAppearanceEditor";
import BlockedUsersSection from "../../components/BlockedUsersSection";
import {
  fetchPrivacySettings,
  mapApiMessagesToUi,
  mapApiVisibilityToUi,
  mapUiMessagesToApi,
  mapUiVisibilityToApi,
  updatePrivacySettings,
} from "@/src/lib/privacy";

type Visibility = "PUBLIC" | "CONNECTIONS" | "PRIVATE";
type MessagePolicy = "EVERYONE" | "FOLLOWERS" | "NO_ONE";
const LOCAL_PREFS_KEY = "linkup_settings_ui_prefs_v1";

type LocalUiPrefs = {
  profession: string;
  whatImBuilding: string;
  interests: string;
  openToConnect: string;
  visibility: Visibility;
  allowMessages: MessagePolicy;
  showCountry: boolean;
  showOnlineStatus: boolean;
  showActivity: boolean;
  showLocalPulse: boolean;
  notifyMessages: boolean;
  notifyLikesComments: boolean;
  notifyFollows: boolean;
  notifyHubs: boolean;
  notifyWorkHappening: boolean;
  browserAlertsEnabled: boolean;
};

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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
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
            ? "border-brand-primary/40 bg-brand-primary"
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
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable account/profile fields supported by updateUserProfile
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [language, setLanguage] = useState("en");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  // UI-only preferences (no backend wiring requested / unknown support)
  const [profession, setProfession] = useState("");
  const [whatImBuilding, setWhatImBuilding] = useState("");
  const [interests, setInterests] = useState("");
  const [openToConnect, setOpenToConnect] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [allowMessages, setAllowMessages] = useState<MessagePolicy>("EVERYONE");
  const [showCountry, setShowCountry] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showLocalPulse, setShowLocalPulse] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyLikesComments, setNotifyLikesComments] = useState(true);
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyHubs, setNotifyHubs] = useState(true);
  const [notifyWorkHappening, setNotifyWorkHappening] = useState(true);
  const [browserAlertsEnabled, setBrowserAlertsEnabledState] = useState(false);
  const [browserAlertStatus, setBrowserAlertStatus] =
    useState<BrowserAlertStatus>("default");
  const [browserAlertMessage, setBrowserAlertMessage] = useState<string | null>(
    null,
  );
  const [uiPrefsReady, setUiPrefsReady] = useState(false);

  const handleAuthFailure = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const load = useCallback(async () => {
    setError(null);
    setSuccess(null);

    try {
      const { user, warning: profileWarning } = await fetchUserProfileSafe();
      setProfileUser(user);
      setUser(user);
      setWarning(profileWarning);

      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setCountry(user.country ?? "United Arab Emirates");
      setLanguage(user.language ?? "en");
      setAvatarUrl(user.avatarUrl ?? "");
      setCoverUrl(user.coverUrl ?? "");

      try {
        const privacy = await fetchPrivacySettings();
        setVisibility(mapApiVisibilityToUi(privacy.profileVisibility));
        setAllowMessages(mapApiMessagesToUi(privacy.messagePermission));
        setShowCountry(privacy.showCountry);
        setShowOnlineStatus(privacy.showOnlineStatus);
        setShowActivity(privacy.showActivity);
      } catch {
        // Privacy API may be unavailable during rollout.
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      setWarning("Settings are warming up. Try again shortly.");
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthFailure, setUser]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBrowserAlertStatus(getBrowserAlertStatus());
    setBrowserAlertsEnabledState(isBrowserAlertsEnabled());
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_PREFS_KEY);
      if (!stored) {
        setUiPrefsReady(true);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<LocalUiPrefs>;
      if (typeof parsed.profession === "string") setProfession(parsed.profession);
      if (typeof parsed.whatImBuilding === "string") {
        setWhatImBuilding(parsed.whatImBuilding);
      }
      if (typeof parsed.interests === "string") setInterests(parsed.interests);
      if (typeof parsed.openToConnect === "string") {
        setOpenToConnect(parsed.openToConnect);
      }
      if (parsed.visibility === "PUBLIC" || parsed.visibility === "PRIVATE" || parsed.visibility === "CONNECTIONS") {
        setVisibility(parsed.visibility);
      }
      if (
        parsed.allowMessages === "EVERYONE" ||
        parsed.allowMessages === "FOLLOWERS" ||
        parsed.allowMessages === "NO_ONE"
      ) {
        setAllowMessages(parsed.allowMessages);
      }
      if (typeof parsed.showCountry === "boolean") setShowCountry(parsed.showCountry);
      if (typeof parsed.showOnlineStatus === "boolean") {
        setShowOnlineStatus(parsed.showOnlineStatus);
      }
      if (typeof parsed.showLocalPulse === "boolean") {
        setShowLocalPulse(parsed.showLocalPulse);
      }
      if (typeof parsed.notifyMessages === "boolean") setNotifyMessages(parsed.notifyMessages);
      if (typeof parsed.notifyLikesComments === "boolean") {
        setNotifyLikesComments(parsed.notifyLikesComments);
      }
      if (typeof parsed.notifyFollows === "boolean") setNotifyFollows(parsed.notifyFollows);
      if (typeof parsed.notifyHubs === "boolean") setNotifyHubs(parsed.notifyHubs);
      if (typeof parsed.notifyWorkHappening === "boolean") {
        setNotifyWorkHappening(parsed.notifyWorkHappening);
      } else {
        const legacy = parsed as Partial<LocalUiPrefs & { notifyUpdates?: boolean }>;
        if (typeof legacy.notifyUpdates === "boolean") {
          setNotifyWorkHappening(legacy.notifyUpdates);
        }
      }
      if (typeof parsed.browserAlertsEnabled === "boolean") {
        setBrowserAlertsEnabledState(parsed.browserAlertsEnabled);
      }
    } catch {
      // Ignore malformed local prefs and continue with defaults.
    } finally {
      setUiPrefsReady(true);
    }
  }, []);

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
    setCardError(null);
    setIsSaving(true);

    const payload: UpdateProfilePayload = {
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim() || undefined,
      country: country.trim() || undefined,
      language: language.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
    };

    try {
      await updateUserProfile(payload);
      await updatePrivacySettings({
        profileVisibility: mapUiVisibilityToApi(visibility),
        messagePermission: mapUiMessagesToApi(allowMessages),
        showCountry,
        showOnlineStatus,
        showActivity,
      });
      const { user: updated } = await fetchUserProfileSafe();
      setProfileUser(updated);
      setUser(updated);
      const localPrefs: LocalUiPrefs = {
        profession,
        whatImBuilding,
        interests,
        openToConnect,
        visibility,
        allowMessages,
        showCountry,
        showOnlineStatus,
        showActivity,
        showLocalPulse,
        notifyMessages,
        notifyLikesComments,
        notifyFollows,
        notifyHubs,
        notifyWorkHappening,
        browserAlertsEnabled,
      };
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(localPrefs));
      setSuccess("Privacy settings updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }

      if (err instanceof ApiError) {
        setError(err.message);
        setCardError("Could not update your LinkUp Card. Please try again.");
      } else {
        setError("Unable to save settings. Please try again.");
        setCardError("Could not update your LinkUp Card. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEnableBrowserAlerts() {
    setBrowserAlertMessage(null);

    if (browserAlertStatus === "unsupported") {
      setBrowserAlertMessage("Browser notifications are not supported on this device.");
      return;
    }

    if (browserAlertStatus === "denied") {
      setBrowserAlertMessage(
        "Browser alerts are blocked. You can enable them in browser settings.",
      );
      return;
    }

    const permission = await requestBrowserAlertPermission();
    setBrowserAlertStatus(permission);

    if (permission === "granted") {
      setBrowserAlertsEnabledState(true);
      setBrowserAlertsEnabled(true);
      setBrowserAlertMessage("Browser alerts enabled.");
      return;
    }

    if (permission === "denied") {
      setBrowserAlertsEnabledState(false);
      setBrowserAlertsEnabled(false);
      setBrowserAlertMessage(
        "Browser alerts are blocked. You can enable them in browser settings.",
      );
      return;
    }

    setBrowserAlertMessage("Browser alerts remain off.");
  }

  function handleDisableBrowserAlerts() {
    setBrowserAlertsEnabledState(false);
    setBrowserAlertsEnabled(false);
    setBrowserAlertMessage("Browser alerts turned off.");
  }

  if (isLoading || !uiPrefsReady) {
    return <SettingsPageSkeleton />;
  }

  if (!profileUser) {
    return (
      <div className="linkup-page">
        <div className="linkup-container">
          <div className="linkup-panel p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {warning ?? error ?? "Settings unavailable."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputShell =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/70 dark:focus-within:border-brand-primary/50";
  const inputClass =
    "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";
  const selectClass = "w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300";

  return (
    <div className="linkup-page">
      <div className="linkup-container">
        <header className="linkup-panel mb-8 p-6 sm:p-7">
          <p className="linkup-eyebrow">LinkUp</p>
          <h1 className="linkup-title mt-3">Settings</h1>
          <p className="linkup-subtitle">
            Manage your account, privacy, appearance, alerts, and LinkUp
            preferences.
          </p>
        </header>

        {warning ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </div>
        ) : null}
        {success ? (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {error}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSave}>
          <SettingsSection
            title="Account"
            description="Your core LinkUp identity. Email and account type are read-only."
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Account type
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatAccountType(profileUser.accountType)}
                </p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Language & Region"
            description="Set your country and preferred language across LinkUp."
          >
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
            title="LinkUp Card Appearance"
            description="Upload your LinkUp Avatar and Pulse Cover, or paste image URLs. Changes sync to your profile."
          >
            {cardError ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {cardError}
              </div>
            ) : null}
            <LinkUpCardAppearanceEditor
              user={profileUser}
              avatarUrl={avatarUrl}
              coverUrl={coverUrl}
              disabled={isSaving}
              onAvatarChange={setAvatarUrl}
              onCoverChange={setCoverUrl}
              onError={setCardError}
            />
          </SettingsSection>

          <SettingsSection
            title="My LinkUp Card"
            description="Shape how you show up on LinkUp. Bio syncs to your profile; other fields save on this device."
          >
            <label className="block space-y-2">
              <span className={labelClass}>Bio / about</span>
              <div className={`${inputShell} items-start py-3`}>
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Who you are and what you're about on LinkUp."
                  disabled={isSaving}
                  rows={4}
                />
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>What I do</span>
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
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>What I&apos;m building</span>
                <div className={inputShell}>
                  <Tag className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    className={inputClass}
                    value={whatImBuilding}
                    onChange={(e) => setWhatImBuilding(e.target.value)}
                    placeholder="e.g. A creator marketplace for MENA"
                    disabled={isSaving}
                  />
                </div>
              </label>
            </div>

            <label className="block space-y-2">
              <span className={labelClass}>Interests / tags</span>
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
                      className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary dark:text-brand-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className={labelClass}>Open to connect for</span>
              <div className={`${inputShell} items-start py-3`}>
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  value={openToConnect}
                  onChange={(e) => setOpenToConnect(e.target.value)}
                  placeholder="Collaborations, mentorship, co-building, projects..."
                  disabled={isSaving}
                  rows={3}
                />
              </div>
            </label>
          </SettingsSection>

          <SettingsSection
            title="Privacy"
            description="Control who sees your profile and how people can reach you."
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
                    <option value="CONNECTIONS">Connections only</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>Allow chats</span>
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
                    <option value="FOLLOWERS">Connections only</option>
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
            <ToggleRow
              label="Show online status"
              description="Let connections see when you're active on LinkUp."
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
              disabled={isSaving}
            />
            <ToggleRow
              label="Show activity"
              description="Let connections see your recent sparks and activity."
              checked={showActivity}
              onChange={setShowActivity}
              disabled={isSaving}
            />
            <ToggleRow
              label="Local Pulse"
              description="Show what's moving near you on Pulse and Discover using your country."
              checked={showLocalPulse}
              onChange={setShowLocalPulse}
              disabled={isSaving}
            />
          </SettingsSection>

          <SettingsSection
            title="Blocked users"
            description="People you have blocked cannot message you or appear in your feed."
          >
            <BlockedUsersSection />
          </SettingsSection>

          <SettingsSection
            title="Alerts"
            description="Choose what shows up in your LinkUp Alerts. Saved on this device until server sync is available."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="Chat alerts"
                description="When someone starts or continues a chat with you."
                checked={notifyMessages}
                onChange={setNotifyMessages}
                disabled={isSaving}
              />
              <ToggleRow
                label="Boost & reply alerts"
                description="When someone boosts or replies to your sparks."
                checked={notifyLikesComments}
                onChange={setNotifyLikesComments}
                disabled={isSaving}
              />
              <ToggleRow
                label="Connect alerts"
                description="When someone connects with you on LinkUp."
                checked={notifyFollows}
                onChange={setNotifyFollows}
                disabled={isSaving}
              />
              <ToggleRow
                label="Hub alerts"
                description="When someone joins or engages with your hubs."
                checked={notifyHubs}
                onChange={setNotifyHubs}
                disabled={isSaving}
              />
              <ToggleRow
                label="Work & happening alerts"
                description="Opportunities from Work and Happenings across your network."
                checked={notifyWorkHappening}
                onChange={setNotifyWorkHappening}
                disabled={isSaving}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Browser notifications
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Get ready for push alerts later. This only requests browser
                    permission on this device.
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Status:{" "}
                    {browserAlertStatus === "unsupported"
                      ? "Not supported"
                      : browserAlertsEnabled && browserAlertStatus === "granted"
                        ? "Browser alerts enabled"
                        : browserAlertStatus === "denied"
                          ? "Blocked by browser"
                          : "Off"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleEnableBrowserAlerts()}
                    disabled={
                      isSaving ||
                      browserAlertStatus === "unsupported" ||
                      browserAlertStatus === "denied"
                    }
                    className="rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Enable
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableBrowserAlerts}
                    disabled={isSaving || !browserAlertsEnabled}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    Off
                  </button>
                </div>
              </div>
              {browserAlertMessage ? (
                <p className="mt-3 text-sm text-brand-primary dark:text-brand-secondary">
                  {browserAlertMessage}
                </p>
              ) : null}
              {browserAlertStatus === "denied" ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                  Browser alerts are blocked. You can enable them in browser settings.
                </p>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Appearance"
            description="How LinkUp looks on your device."
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
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
            title="Connected Accounts"
            description="Link external accounts for faster sign-in and recovery."
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Google
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Connect Google later for faster sign-in and account recovery.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="linkup-btn-secondary min-h-[44px] shrink-0 opacity-60"
                >
                  Connect Google
                </button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Legal"
            description="Review LinkUp terms and privacy information."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-primary/30 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark/70 dark:hover:border-brand-secondary/30 dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Terms and Conditions
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Platform rules, eligibility, and user responsibilities.
                  </p>
                </div>
              </Link>
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-primary/30 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark/70 dark:hover:border-brand-secondary/30 dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Privacy Policy
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    How LinkUp collects, uses, and protects your data.
                  </p>
                </div>
              </Link>
              <a
                href="mailto:admin@thelinkupzone.com"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-brand-primary/30 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark/70 dark:hover:border-brand-secondary/30 dark:hover:bg-white/[0.04] sm:col-span-2 lg:col-span-1"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Contact Support
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    admin@thelinkupzone.com
                  </p>
                </div>
              </a>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Danger Zone"
            description="Sign out or remove your account. Deletion requires backend support."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-brand-dark/70">
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
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-brand-light opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </button>
              </div>
            </div>
          </SettingsSection>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Bell className="h-4 w-4 text-brand-primary" />
              Account bio and LinkUp Card media save to your profile. Privacy, alerts, and LinkUp Card extras save on this device.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
