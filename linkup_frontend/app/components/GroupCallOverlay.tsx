"use client";

import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { CallType } from "@/src/lib/webrtc";
import { GroupCallParticipant } from "@/src/lib/groupWebrtc";

interface GroupCallOverlayProps {
  callType: CallType;
  roomLabel: string;
  localUserId: string;
  localName: string;
  localStream: MediaStream | null;
  participants: GroupCallParticipant[];
  remoteStreams: Record<string, MediaStream>;
  status: "connecting" | "active";
  audioEnabled: boolean;
  videoEnabled: boolean;
  socketConnected: boolean;
  onLeave: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

function ParticipantTile({
  name,
  stream,
  isLocal,
  callType,
  muted,
  videoOff,
}: {
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  callType: CallType;
  muted?: boolean;
  videoOff?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo =
    callType === "video" &&
    stream &&
    !videoOff &&
    stream.getVideoTracks().some((track) => track.enabled);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    node.srcObject = showVideo ? stream : null;
    if (showVideo) {
      void node.play().catch(() => undefined);
    }
  }, [showVideo, stream]);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const node = audioRef.current;
    if (!node || callType !== "audio" || !stream) {
      return;
    }
    node.srcObject = stream;
    void node.play().catch(() => undefined);
  }, [callType, stream]);

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-brand-dark/90 sm:aspect-video">
      {callType === "audio" && stream ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} autoPlay playsInline className="sr-only" />
      ) : null}
      {showVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`h-full w-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-lg font-semibold text-white">
            {getInitials(name)}
          </div>
          <p className="text-xs text-slate-400">
            {stream ? "Connected" : "Connecting..."}
          </p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <span className="truncate text-xs font-medium text-white">
          {isLocal ? `${name} (You)` : name}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {muted ? <MicOff className="h-3.5 w-3.5 text-rose-300" /> : null}
          {videoOff && callType === "video" ? (
            <VideoOff className="h-3.5 w-3.5 text-rose-300" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function GroupCallOverlay({
  callType,
  roomLabel,
  localUserId,
  localName,
  localStream,
  participants,
  remoteStreams,
  status,
  audioEnabled,
  videoEnabled,
  socketConnected,
  onLeave,
  onToggleAudio,
  onToggleVideo,
}: GroupCallOverlayProps) {
  const remoteParticipants = participants.filter(
    (participant) => participant.userId !== localUserId,
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black/80">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-secondary">
            Live Group Call
          </p>
          <h2 className="truncate text-lg font-semibold text-white">{roomLabel}</h2>
          <p className="text-sm text-slate-400">
            {status === "connecting"
              ? "Connecting..."
              : `${participants.length} participant${participants.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-secondary">
          <Users className="h-5 w-5" />
        </div>
      </div>

      {!socketConnected ? (
        <div className="mx-4 mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          Live connection lost. Reconnecting...
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ParticipantTile
            name={localName}
            stream={localStream}
            isLocal
            callType={callType}
            muted={!audioEnabled}
            videoOff={!videoEnabled}
          />
          {remoteParticipants.map((participant) => (
            <ParticipantTile
              key={participant.userId}
              stream={remoteStreams[participant.userId] ?? null}
              name={participant.name}
              callType={callType}
            />
          ))}
        </div>

        {remoteParticipants.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            Waiting for others to join...
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-4 sm:gap-3">
        <button
          type="button"
          onClick={onToggleAudio}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
          aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        {callType === "video" ? (
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
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white"
        >
          <PhoneOff className="h-4 w-4" />
          Leave Call
        </button>
      </div>
    </div>
  );
}
