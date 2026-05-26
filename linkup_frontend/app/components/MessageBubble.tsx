type MessageBubbleProps = {
  text: string;
  time: string;
  fromMe?: boolean;
};

export default function MessageBubble({ text, time, fromMe }: MessageBubbleProps) {
  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-[1.75rem] border border-white/10 px-5 py-4 text-sm leading-6 shadow-sm transition duration-300 ${
        fromMe ? "bg-violet-500/15 text-slate-100 shadow-violet-500/10" : "bg-slate-900/90 text-slate-300 shadow-slate-950/20"
      }`}>
        <p>{text}</p>
        <span className="mt-2 block text-right text-[11px] text-slate-500">{time}</span>
      </div>
    </div>
  );
}
