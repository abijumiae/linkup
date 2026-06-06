"use client";

import { Hand } from "lucide-react";
import { memo } from "react";
import { LiveTalkParticipantView } from "@/app/hooks/useGroupLiveTalk";
import AudioWaveBars from "./AudioWaveBars";
import {
  isParticipantSpeaking,
  participantInitials,
} from "./liveTalkParticipantUtils";

type LiveTalkParticipantCompactProps = {
  participant: LiveTalkParticipantView;
  activeMicUserId?: string | null;
  localUserId: string;
  isOnline: boolean;
};

function LiveTalkParticipantCompactComponent({
  participant: p,
  activeMicUserId,
  localUserId,
  isOnline,
}: LiveTalkParticipantCompactProps) {
  const speaking = isParticipantSpeaking(p, activeMicUserId);

  return (
    <div className="relative flex w-[3.25rem] shrink-0 flex-col items-center gap-1">
      <div className="relative">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300 ${
            speaking
              ? "linkup-lt-speaker-avatar text-white"
              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
          }`}
        >
          {participantInitials(p.name)}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-slate-100 dark:border-slate-900 ${
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        {p.handRaised ? (
          <Hand className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-amber-500" />
        ) : null}
      </div>
      <AudioWaveBars active={speaking} size="sm" className="min-h-[14px]" />
      <span className="max-w-full truncate text-center text-[10px] text-slate-500 dark:text-slate-400">
        {p.userId === localUserId ? "You" : p.name.split(" ")[0]}
      </span>
    </div>
  );
}

export default memo(LiveTalkParticipantCompactComponent);
