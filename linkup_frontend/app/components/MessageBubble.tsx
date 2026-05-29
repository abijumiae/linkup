type MessageBubbleProps = {
  text?: string;
  time: string;
  fromMe?: boolean;
  read?: boolean;
  senderName?: string;
  type?: string;
  mediaUrl?: string | null;
  duration?: number | null;
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function MessageBubble({
  text,
  time,
  fromMe,
  read,
  senderName,
  type,
  mediaUrl,
  duration,
}: MessageBubbleProps) {
  const isVoice = type === "voice" && Boolean(mediaUrl);

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm transition duration-300 sm:max-w-[80%] sm:px-5 sm:py-3.5 ${
          fromMe
            ? "bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-brand-primary/20"
            : "border border-slate-200/80 bg-white text-slate-700 dark:border-white/10 dark:bg-brand-dark/90 dark:text-slate-200"
        }`}
      >
        {!fromMe && senderName ? (
          <p className="mb-1 text-xs font-semibold text-brand-primary dark:text-brand-secondary">
            {senderName}
          </p>
        ) : null}

        {isVoice ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Voice note
              </span>
              {duration ? (
                <span className="text-xs opacity-75">
                  {formatDuration(duration)}
                </span>
              ) : null}
            </div>
            <audio
              controls
              preload="metadata"
              src={mediaUrl ?? undefined}
              className="h-10 w-full min-w-[180px] max-w-[260px] rounded-xl"
            />
          </div>
        ) : text ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : null}

        <span
          className={`mt-1.5 block text-right text-[10px] ${
            fromMe ? "text-white/75" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {time}
          {fromMe && read !== undefined ? (
            <span className="ml-1">{read ? " · Seen" : " · Sent"}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
