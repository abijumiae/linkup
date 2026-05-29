"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/AuthProvider";
import LinkupNavigation from "./LinkupNavigation";
import { SidebarNav } from "./SidebarNav";

const sidebarNavItems = [
  { label: "Pulse", href: "/home", icon: "home" },
  { label: "Discover", href: "/explore", icon: "explore" },
  { label: "Chats", href: "/messages", icon: "messages" },
  { label: "Hubs", href: "/groups", icon: "groups" },
  { label: "Market", href: "/marketplace", icon: "marketplace" },
  { label: "Work", href: "/jobs", icon: "jobs" },
  { label: "Happenings", href: "/events", icon: "events" },
  { label: "Alerts", href: "/notifications", icon: "notifications" },
  { label: "Profile", href: "/profile", icon: "profile" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify-email" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth/") ||
    pathname === "/";
  const showNavigation = isAuthenticated && !isAuthPage;

  return (
    <>
      {showNavigation && <LinkupNavigation />}
      <div
        className={`flex ${showNavigation ? "min-h-[calc(100vh-72px)]" : "min-h-screen"}`}
      >
        {showNavigation && (
          <aside className="hidden w-[280px] shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/90 p-4 lg:block lg:py-6 dark:border-white/10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/80">
            <div className="sticky top-28 space-y-4">
              <Link
                href="/home"
                className="linkup-panel flex items-center gap-3 px-3 py-2.5 shadow-md"
              >
                <img
                  src="/brand/app-icon.png"
                  alt="LinkUp"
                  className="h-9 w-9 rounded-xl object-cover"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  LinkUp
                </span>
              </Link>
              <SidebarNav items={sidebarNavItems} title="Navigation" />
            </div>
          </aside>
        )}
        <main className="linkup-main min-w-0 flex-1 overflow-x-hidden pb-28 lg:pb-16">
          {children}
        </main>
      </div>
    </>
  );
}
