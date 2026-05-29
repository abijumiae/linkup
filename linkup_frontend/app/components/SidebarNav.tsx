"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  CalendarDays,
  Compass,
  Home,
  MessageCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
} from "lucide-react";
import { useNotifications } from "@/src/lib/NotificationsContext";

type SidebarIconKey =
  | "home"
  | "explore"
  | "messages"
  | "groups"
  | "notifications"
  | "marketplace"
  | "jobs"
  | "events"
  | "settings"
  | "admin"
  | "profile";

interface SidebarNavItem {
  label: string;
  href: string;
  icon: SidebarIconKey;
}

interface SidebarNavProps {
  items: readonly SidebarNavItem[];
  title?: string;
}

const iconMap: Record<SidebarIconKey, typeof Home> = {
  home: Home,
  explore: Compass,
  messages: MessageCircle,
  groups: Users,
  notifications: Bell,
  marketplace: ShoppingBag,
  jobs: Briefcase,
  events: CalendarDays,
  settings: Settings,
  admin: ShieldCheck,
  profile: User,
};

export function SidebarNav({ items, title = "Navigation" }: SidebarNavProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <nav className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = iconMap[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex w-full min-w-0 items-center gap-3 rounded-3xl px-3 py-2.5 text-sm font-medium transition sm:px-4 sm:py-3 ${
                  isActive
                    ? "bg-gradient-to-r from-brand-primary/20 via-brand-primary/15 to-brand-secondary/20 text-brand-text shadow-lg shadow-brand-primary/10 dark:text-brand-light"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-brand-primary dark:text-brand-secondary" : "text-slate-400"}`}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.icon === "notifications" && unreadCount > 0 ? (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-brand-light">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
