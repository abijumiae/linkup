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
  Play,
  Search,
  UserCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/src/lib/AuthProvider";
import { useNotifications } from "@/src/lib/NotificationsContext";
import { ThemeToggle } from "./ThemeToggle";
import UserAvatar from "./UserAvatar";

const mobileNavItems = [
  { label: "Pulse", href: "/home", icon: Home },
  { label: "Discover", href: "/explore", icon: Compass },
  { label: "Watch", href: "/watch", icon: Play },
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

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const showAuthActions = !isAuthPage;

  return (
    <>
      <header className="linkup-topbar">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <Link
            href="/home"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 sm:tracking-[0.35em] dark:text-white"
          >
            <img
              src="/brand/app-icon.png"
              alt="LinkUp"
              className="h-8 w-8 rounded-xl object-cover shadow-lg shadow-brand-primary/20 sm:h-9 sm:w-9"
            />
            <span className="hidden sm:inline">LinkUp</span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:flex">
            <form onSubmit={handleSearchSubmit} className="linkup-input-shell relative flex-1 rounded-full py-2.5 pl-12">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="linkup-input"
                placeholder="Discover people, sparks, hubs, market, work..."
              />
            </form>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <ThemeToggle />
            ) : null}
            <Link
              href="/messages"
              className="linkup-focus-ring linkup-touch-target hidden rounded-full border border-slate-300 bg-white text-slate-700 transition duration-150 hover:scale-105 active:scale-95 hover:bg-slate-50 sm:inline-flex dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300 dark:hover:bg-white/10"
              aria-label="Open chats"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="linkup-focus-ring linkup-touch-target relative rounded-full border border-slate-300 bg-white text-slate-700 transition duration-150 hover:scale-105 active:scale-95 hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {isAuthenticated && unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-brand-light">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>

            {showAuthActions && isAuthenticated && user ? (
              <Link
                href="/profile"
                title={displayName}
                aria-label={`Profile: ${displayName}`}
                className="linkup-focus-ring linkup-touch-target md:hidden"
              >
                <UserAvatar
                  src={user.avatarUrl}
                  name={user.name}
                  username={user.username}
                  size="sm"
                />
              </Link>
            ) : null}

            {showAuthActions && isAuthenticated && user ? (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
                className="linkup-focus-ring linkup-touch-target inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition duration-150 hover:scale-105 active:scale-95 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : null}

            {showAuthActions && isAuthenticated && user ? (
              <>
                <div className="hidden min-w-0 max-w-[200px] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 md:flex dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-300">
                  <UserAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    username={user.username}
                    size="sm"
                    alt={displayName}
                  />
                  <span className="min-w-0 truncate">{displayName}</span>
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
                <Link href="/signup" className="hidden rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-light transition hover:bg-brand-primary-hover md:inline-flex">
                  Join
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200/80 px-3 pb-3 pt-2 md:hidden dark:border-white/10">
          <form onSubmit={handleSearchSubmit} className="linkup-input-shell relative rounded-full py-2 pl-10">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="linkup-input text-base"
              placeholder="Discover people, sparks, hubs..."
            />
          </form>
        </div>
      </header>

      <nav className="linkup-bottom-nav px-2 py-1.5">
        <div className="mx-auto flex max-w-md items-center justify-between gap-0.5">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/watch" && pathname.startsWith("/watch/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`linkup-focus-ring inline-flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition duration-150 active:scale-95 sm:text-[11px] ${
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
