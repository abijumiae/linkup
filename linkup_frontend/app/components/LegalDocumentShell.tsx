import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type LegalDocumentShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function LegalDocumentShell({
  children,
  backHref = "/",
  backLabel = "Back to Home",
}: LegalDocumentShellProps) {
  return (
    <div className="linkup-page min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-primary/5 text-slate-900 dark:from-brand-dark dark:via-brand-dark dark:to-brand-dark dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-14rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-primary/15 via-brand-primary/10 to-brand-secondary/15 blur-3xl"
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-[900px] px-3 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm font-medium text-brand-primary transition hover:text-brand-primary-hover dark:text-brand-secondary dark:hover:text-brand-secondary-hover"
          >
            ← {backLabel}
          </Link>
          <Link href="/" className="inline-flex items-center gap-2">
            <img
              src="/brand/logo-transparent.png"
              alt="LinkUp"
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        <article className="linkup-panel p-6 sm:p-8 lg:p-10">{children}</article>

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/terms" className="hover:text-brand-primary dark:hover:text-brand-secondary">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-brand-primary dark:hover:text-brand-secondary">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <a
            href="mailto:admin@thelinkupzone.com"
            className="hover:text-brand-primary dark:hover:text-brand-secondary"
          >
            admin@thelinkupzone.com
          </a>
        </footer>
      </div>
    </div>
  );
}
