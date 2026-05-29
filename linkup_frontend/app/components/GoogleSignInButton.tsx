import { getApiBaseUrl } from "@/src/lib/api";

export default function GoogleSignInButton() {
  function handleGoogleSignIn() {
    window.location.href = `${getApiBaseUrl()}/auth/google`;
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:bg-white/10"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">
        G
      </span>
      Continue with Google
    </button>
  );
}
