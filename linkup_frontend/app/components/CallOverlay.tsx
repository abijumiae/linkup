"use client";

import { PhoneOff, Video, Mic } from "lucide-react";
import { CallType } from "@/src/lib/webrtc";

interface CallOverlayProps {
  callType: CallType;
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: "connecting" | "active" | "incoming";
  onAccept?: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

function VideoPane({
  stream,
  label,
  mirrored,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-dark/90 aspect-video">
      {stream ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={(node) => {
            if (node && stream) {
              node.srcObject = stream;
              void node.play().catch(() => undefined);
            }
          }}
          autoPlay
          playsInline
          muted={mirrored}
          className={`h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-slate-400">
          Waiting for {label.toLowerCase()}...
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
        {label}
      </span>
    </div>
  );
}

export default function CallOverlay({
  callType,
  peerName,
  localStream,
  remoteStream,
  status,
  onAccept,
  onDecline,
  onEnd,
}: CallOverlayProps) {
  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-brand-dark p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
              {status === "incoming" ? "Incoming call" : "Live call"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">{peerName}</h2>
            <p className="text-sm text-slate-400">
              {status === "connecting"
                ? "Connecting..."
                : isVideo
                  ? "Video call"
                  : "Audio call"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/20 text-brand-secondary">
            {isVideo ? <Video className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
        </div>

        {isVideo ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <VideoPane stream={remoteStream} label={peerName} />
            <VideoPane stream={localStream} label="You" mirrored />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/30 text-2xl font-semibold text-white">
              {peerName.slice(0, 1).toUpperCase()}
            </div>
            {remoteStream ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio
                ref={(node) => {
                  if (node && remoteStream) {
                    node.srcObject = remoteStream;
                    void node.play().catch(() => undefined);
                  }
                }}
                autoPlay
                playsInline
                className="sr-only"
              />
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {status === "incoming" ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white"
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEnd}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white"
            >
              <PhoneOff className="h-4 w-4" />
              End call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
