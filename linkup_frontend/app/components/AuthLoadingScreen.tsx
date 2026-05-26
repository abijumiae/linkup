import { Loader2 } from "lucide-react";

export default function AuthLoadingScreen({ message = "Checking your session..." }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-200 bg-white px-8 py-10 text-center shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
