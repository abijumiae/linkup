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
    <nav className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
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
                className={`inline-flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-sky-500/20 text-white shadow-lg shadow-violet-500/10"
                    : "text-slate-200 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-violet-300" : "text-slate-400"}`} />
                <span className="flex-1">{item.label}</span>
                {item.icon === "notifications" && unreadCount > 0 ? (
                  <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
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
