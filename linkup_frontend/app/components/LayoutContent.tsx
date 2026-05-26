"use client";

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
      <div className={`flex ${showNavigation ? "min-h-[calc(100vh-72px)]" : "min-h-screen"}`}>
        {showNavigation && (
          <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/80 p-4 md:block md:py-6 lg:w-72 dark:border-white/10 dark:bg-slate-950/80">
            <div className="sticky top-28 space-y-4">
              <SidebarNav items={sidebarNavItems} title="Navigation" />
            </div>
          </aside>
        )}
        <main className="flex-1 min-w-0 pb-28 md:pb-16">{children}</main>
      </div>
    </>
  );
}
