"use client";

import { useEffect, useState } from "react";
import { Flag, ShieldBan } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  blockUser,
  fetchBlockStatus,
  unblockUser,
} from "@/src/lib/safety";
import ReportModal from "./ReportModal";

type ChatSafetyMenuProps = {
  userId: string;
  userName: string;
  onBlockChange?: (blocked: boolean) => void;
};

export default function ChatSafetyMenu({
  userId,
  userName,
  onBlockChange,
}: ChatSafetyMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetchBlockStatus(userId)
      .then((status) => {
        setBlockedByMe(status.blockedByMe);
        onBlockChange?.(status.isBlocked);
      })
      .catch(() => {
        // Ignore status load failures.
      });
  }, [userId, onBlockChange]);

  async function handleBlockToggle() {
    setLoading(true);
    setNotice(null);
    setOpen(false);

    try {
      if (blockedByMe) {
        await unblockUser(userId);
        setBlockedByMe(false);
        onBlockChange?.(false);
        setNotice("User unblocked.");
      } else {
        await blockUser(userId);
        setBlockedByMe(true);
        onBlockChange?.(true);
        setNotice("You blocked this user.");
      }
    } catch (err) {
      setNotice(
        err instanceof ApiError
          ? err.message
          : "Could not update block status.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={loading}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 disabled:opacity-40 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:bg-white/10"
        aria-label="Chat safety options"
      >
        ···
      </button>

      {notice ? (
        <p className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg dark:border-white/10 dark:bg-brand-dark dark:text-slate-300">
          {notice}
        </p>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-brand-dark">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <Flag className="h-4 w-4" />
            Report user
          </button>
          <button
            type="button"
            onClick={() => void handleBlockToggle()}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <ShieldBan className="h-4 w-4" />
            {blockedByMe ? "Unblock user" : "Block user"}
          </button>
        </div>
      ) : null}

      <ReportModal
        open={reportOpen}
        targetType="USER"
        targetId={userId}
        targetLabel={`Report ${userName}`}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
