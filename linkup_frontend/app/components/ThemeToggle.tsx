"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/src/lib/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
