import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LinkupNavigation from "./components/LinkupNavigation";
import Providers from "./providers";
import { SidebarNav } from "./components/SidebarNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkUp · Connect Everything",
  description: "LinkUp premium dark social dashboard for connecting people, topics, and communities.",
};

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

// Admin route will be protected later using backend authentication and role-based access control.
// Keep /admin available for development preview only; do not expose this in the normal user sidebar.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-slate-950 text-slate-100">
        <Providers>
          <LinkupNavigation />
          <div className="flex min-h-[calc(100vh-72px)]">
            <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-slate-950/80 p-4 md:block md:py-6 lg:w-72">
              <div className="sticky top-28 space-y-4">
                <SidebarNav items={sidebarNavItems} title="Navigation" />
              </div>
            </aside>
            <main className="flex-1 min-w-0 pb-28 md:pb-16">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
