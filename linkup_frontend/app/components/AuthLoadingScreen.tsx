import { Loader2 } from "lucide-react";

export default function AuthLoadingScreen({ message = "Checking your session..." }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="linkup-panel flex flex-col items-center gap-4 px-8 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
