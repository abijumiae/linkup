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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4 text-brand-secondary" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-brand-primary" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
