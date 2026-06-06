"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/lib/AuthProvider";
import AuthLoadingScreen from "../components/AuthLoadingScreen";

const adminNav = [
  { label: "Overview", href: "/admin" },
  { label: "Moderation", href: "/admin/moderation" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/login?redirect=/admin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <AuthLoadingScreen message="Loading admin…" />;
  }

  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
    return (
      <div className="linkup-page flex min-h-screen items-center justify-center p-6">
        <div className="linkup-panel max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Access denied
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Admin or moderator role required.
          </p>
          <Link href="/home" className="linkup-btn-primary mt-6">
            Back to Pulse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page min-h-screen">
      <header className="border-b border-slate-200/90 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="linkup-eyebrow">Platform</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="linkup-btn-ghost min-h-[40px] text-xs sm:text-sm"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/home" className="linkup-btn-secondary min-h-[40px] text-xs sm:text-sm">
              Exit Admin
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
