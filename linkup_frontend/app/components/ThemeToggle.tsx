"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/src/lib/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div
        className="inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950"
        aria-hidden
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="linkup-icon-btn min-h-[44px] min-w-[44px] gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:min-w-0 sm:px-3"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-brand-secondary" aria-hidden />
      ) : (
        <Moon className="h-5 w-5 text-brand-primary" aria-hidden />
      )}
      <span className="hidden text-xs font-semibold sm:inline">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
