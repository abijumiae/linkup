type MessageBubbleProps = {
  text: string;
  time: string;
  fromMe?: boolean;
};

export default function MessageBubble({ text, time, fromMe }: MessageBubbleProps) {
  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[1.75rem] border px-5 py-4 text-sm leading-6 shadow-sm transition duration-300 ${
          fromMe
            ? "border-violet-400/30 bg-violet-500/10 text-slate-900 shadow-violet-500/10 dark:border-white/10 dark:bg-violet-500/15 dark:text-slate-100 dark:shadow-violet-500/10"
            : "border-slate-200 bg-white text-slate-700 shadow-slate-950/10 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300 dark:shadow-slate-950/20"
        }`}
      >
        <p>{text}</p>
        <span className="mt-2 block text-right text-[11px] text-slate-500">{time}</span>
      </div>
    </div>
  );
}
