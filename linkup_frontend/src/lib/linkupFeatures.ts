/** LinkUp unique feature concepts — UI-safe placeholders and helpers (Phase 1) */

export const DAILY_SPARK_PROMPTS = [
  "What are you building today?",
  "Drop one useful thing you learned.",
  "Share a quick win.",
  "Ask your network something.",
  "What opportunity are you looking for?",
  "What helped you grow today?",
  "Share one idea worth spreading.",
] as const;

export const DAILY_SPARK_LAST_KEY = "linkup_daily_spark_last_v1";

export const BOOST_REACTION_LABELS = ["Useful", "Inspired", "Support"] as const;

export const HUB_CHALLENGES = [
  {
    title: "Share one useful resource",
    description: "Drop a link, tool, or tip that helped you this week.",
  },
  {
    title: "Introduce yourself",
    description: "Tell the hub who you are and what you're working on.",
  },
  {
    title: "Post today's progress",
    description: "Share one update on what you moved forward today.",
  },
] as const;

export const ACTIVITY_BADGES = [
  { id: "spark-streak", label: "3-day Spark streak", hint: "Keep dropping sparks daily" },
  { id: "early-builder", label: "Early Builder", hint: "Building momentum on LinkUp" },
  { id: "hub-starter", label: "Hub Starter", hint: "Join or create a hub to unlock" },
] as const;

export const LOCAL_PREFS_KEY = "linkup_settings_ui_prefs_v1";

export type LocalProfilePrefs = {
  profession: string;
  interests: string[];
  openToConnect: string;
  showLocalPulse: boolean;
};

export function getDailySparkPrompt(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayIndex = Math.floor((date.getTime() - start) / 86400000);
  return DAILY_SPARK_PROMPTS[dayIndex % DAILY_SPARK_PROMPTS.length];
}

function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Client-only: track whether user dropped a spark today (no backend streak yet). */
export function hasDailySparkToday(date = new Date()): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(DAILY_SPARK_LAST_KEY) === getTodayKey(date);
  } catch {
    return false;
  }
}

export function markDailySparkComplete(date = new Date()): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(DAILY_SPARK_LAST_KEY, getTodayKey(date));
  } catch {
    // Ignore storage errors.
  }
}

export function getHubChallenge(date = new Date()): (typeof HUB_CHALLENGES)[number] {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayIndex = Math.floor((date.getTime() - start) / 86400000);
  return HUB_CHALLENGES[dayIndex % HUB_CHALLENGES.length];
}

export function getLocalProfilePrefs(): LocalProfilePrefs {
  if (typeof window === "undefined") {
    return {
      profession: "",
      interests: [],
      openToConnect: "",
      showLocalPulse: true,
    };
  }

  try {
    const stored = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!stored) {
      return {
        profession: "",
        interests: [],
        openToConnect: "",
        showLocalPulse: true,
      };
    }

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const interestsRaw =
      typeof parsed.interests === "string" ? parsed.interests : "";

    return {
      profession:
        typeof parsed.profession === "string" ? parsed.profession : "",
      interests: interestsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
      openToConnect:
        typeof parsed.openToConnect === "string" ? parsed.openToConnect : "",
      showLocalPulse:
        typeof parsed.showLocalPulse === "boolean"
          ? parsed.showLocalPulse
          : typeof parsed.showCountry === "boolean"
            ? parsed.showCountry
            : true,
    };
  } catch {
    return {
      profession: "",
      interests: [],
      openToConnect: "",
      showLocalPulse: true,
    };
  }
}
