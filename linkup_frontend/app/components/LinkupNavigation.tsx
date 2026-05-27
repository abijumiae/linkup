"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Bell,
  Compass,
  Home,
  LogOut,
  MessageCircle,
  Search,
  UserCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/src/lib/AuthProvider";
import { useNotifications } from "@/src/lib/NotificationsContext";
import { ThemeToggle } from "./ThemeToggle";

const mobileNavItems = [
  { label: "Pulse", href: "/home", icon: Home },
  { label: "Discover", href: "/explore", icon: Compass },
  { label: "Chats", href: "/messages", icon: MessageCircle },
  { label: "Hubs", href: "/groups", icon: Users },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

export default function LinkupNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      router.push("/explore");
      return;
    }

    router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const displayName = user ? (user.username || user.name) : "Guest";
  const avatarLabel = user?.avatarUrl
    ? undefined
    : (user?.name?.[0] ?? user?.username?.[0] ?? "G").toUpperCase();

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const showAuthActions = !isAuthPage;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-900 dark:text-white"
          >
            <img
              src="/brand/app-icon.png"
              alt="LinkUp"
              className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-violet-500/20"
            />
            <span className="hidden sm:inline">LinkUp</span>
          </Link>

          <div className="hidden flex-1 md:flex">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 pl-12 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100"
                placeholder="Discover people, sparks, hubs..."
              />
            </form>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? <ThemeToggle /> : null}
            <Link
              href="/messages"
              className="rounded-full border border-slate-300 bg-white p-3 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              className="relative rounded-full border border-slate-300 bg-white p-3 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {isAuthenticated && unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-slate-950">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>

            {showAuthActions && isAuthenticated && user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 md:flex dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-sm font-semibold text-violet-300">
                      {avatarLabel}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 md:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : null}
            {showAuthActions && !isAuthenticated ? (
              <>
                <Link href="/login" className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 md:inline-flex">
                  Sign in
                </Link>
                <Link href="/signup" className="hidden rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 md:inline-flex">
                  Join
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 px-4 py-2 shadow-[0_-10px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_-10px_60px_rgba(15,23,42,0.35)]">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex flex-col items-center gap-1 rounded-3xl px-3 py-2 text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-violet-500 text-slate-950"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
