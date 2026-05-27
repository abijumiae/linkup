"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/AuthProvider";
import LinkupNavigation from "./LinkupNavigation";
import { SidebarNav } from "./SidebarNav";

const sidebarNavItems = [
  { label: "Home", href: "/home", icon: "home" },
  { label: "Explore", href: "/explore", icon: "explore" },
  { label: "Messages", href: "/messages", icon: "messages" },
  { label: "Groups", href: "/groups", icon: "groups" },
  { label: "Marketplace", href: "/marketplace", icon: "marketplace" },
  { label: "Jobs", href: "/jobs", icon: "jobs" },
  { label: "Events", href: "/events", icon: "events" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
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
    pathname === "/";
  const showNavigation = isAuthenticated && !isAuthPage;

  return (
    <>
      {showNavigation && <LinkupNavigation />}
      <div
        className={`flex ${showNavigation ? "min-h-[calc(100vh-72px)]" : "min-h-screen"}`}
      >
        {showNavigation && (
          <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/80 p-4 lg:block lg:py-6 dark:border-white/10 dark:bg-slate-950/80">
            <div className="sticky top-28 space-y-4">
              <Link
                href="/home"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
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
        <main className="min-w-0 flex-1 pb-28 lg:pb-16">{children}</main>
      </div>
    </>
  );
}
