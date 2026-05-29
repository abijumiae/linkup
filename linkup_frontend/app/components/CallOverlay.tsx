"use client";

import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { CallType } from "@/src/lib/webrtc";

interface CallOverlayProps {
  callType: CallType;
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: "connecting" | "active" | "incoming";
  audioEnabled: boolean;
  videoEnabled: boolean;
  onAccept?: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

function MediaVideo({
  stream,
  label,
  mirrored,
  className,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    node.srcObject = stream;
    if (stream) {
      void node.play().catch(() => undefined);
    }
  }, [stream]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-brand-dark/90 ${className ?? ""}`}
    >
      {stream ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={mirrored}
          className={`h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center text-sm text-slate-400">
          Connecting...
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
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
  audioEnabled,
  videoEnabled,
  onAccept,
  onDecline,
  onEnd,
  onToggleAudio,
  onToggleVideo,
}: CallOverlayProps) {
  const isVideo = callType === "video";
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) {
      return;
    }
    node.srcObject = remoteStream;
    if (remoteStream) {
      void node.play().catch(() => undefined);
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/75 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-brand-dark shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-secondary">
              {status === "incoming" ? "Incoming call" : "Live call"}
            </p>
            <h2 className="truncate text-lg font-semibold text-white">
              {peerName}
            </h2>
            <p className="text-sm text-slate-400">
              {status === "connecting"
                ? "Connecting..."
                : status === "incoming"
                  ? isVideo
                    ? "Incoming video call"
                    : "Incoming audio call"
                  : isVideo
                    ? "Video call"
                    : "Audio call"}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-secondary">
            {isVideo ? <Video className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
        </div>

        <div className="relative p-3 sm:p-4">
          {isVideo ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:aspect-video">
              <MediaVideo
                stream={remoteStream}
                label={peerName}
                className="absolute inset-0 h-full w-full"
              />
              <div className="absolute bottom-3 right-3 z-10 w-[38%] max-w-[140px] overflow-hidden rounded-xl border border-white/20 shadow-lg sm:max-w-[180px]">
                <MediaVideo
                  stream={localStream}
                  label="You"
                  mirrored
                  className="aspect-[3/4] sm:aspect-video"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-10 sm:py-12">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-3xl font-semibold text-white">
                {peerName.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm text-slate-400">
                {remoteStream ? "Connected" : "Connecting..."}
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio ref={audioRef} autoPlay playsInline className="sr-only" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-4 sm:gap-3">
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
            <>
              <button
                type="button"
                onClick={onToggleAudio}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
                aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {audioEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </button>
              {isVideo ? (
                <button
                  type="button"
                  onClick={onToggleVideo}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
                  aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {videoEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onEnd}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white"
              >
                <PhoneOff className="h-4 w-4" />
                End call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
