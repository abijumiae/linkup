"use client";

import { Socket } from "socket.io-client";
import { buildIceServers } from "./webrtcConfig";

export type CallType = "audio" | "video";

export interface CallSessionOptions {
  socket: Socket;
  localUserId: string;
  peerId: string;
  callType: CallType;
  isInitiator: boolean;
  pendingOffer?: RTCSessionDescriptionInit;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
  onConnected: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = buildIceServers();

export function isWebRTCSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export class CallSession {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private readonly options: CallSessionOptions;
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];
  private ended = false;
  private audioEnabled = true;
  private videoEnabled = true;

  constructor(options: CallSessionOptions) {
    this.options = options;
    this.videoEnabled = options.callType === "video";
  }

  async start() {
    if (!isWebRTCSupported()) {
      this.options.onError("Calls are not supported on this device or browser.");
      this.end(false);
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.options.callType === "video",
      });
      this.options.onLocalStream(this.localStream);

      this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      this.peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          this.options.onRemoteStream(stream);
          this.options.onConnected();
        }
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.options.socket.emit("ice_candidate", {
            peerId: this.options.peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      this.options.socket.on("call_offer", this.handleOffer);
      this.options.socket.on("call_answer", this.handleAnswer);
      this.options.socket.on("ice_candidate", this.handleIceCandidate);
      this.options.socket.on("call_end", this.handleRemoteEnd);
      this.options.socket.on("call_rejected", this.handleRemoteReject);
      this.options.socket.on("call_ended", this.handleRemoteEnd);

      if (this.options.isInitiator) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.options.callType === "video",
        });
        await this.peerConnection.setLocalDescription(offer);
        this.options.socket.emit("call_offer", {
          peerId: this.options.peerId,
          sdp: offer,
          callType: this.options.callType,
        });
        return;
      }

      if (this.options.pendingOffer) {
        await this.applyOffer(this.options.pendingOffer);
      }
    } catch {
      this.options.onError(
        "Camera or microphone permission is required.",
      );
      this.end(false);
    }
  }

  private async applyOffer(sdp: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      return;
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(sdp),
    );
    await this.flushPendingCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.options.socket.emit("call_answer", {
      peerId: this.options.peerId,
      sdp: answer,
    });
  }

  private handleOffer = async (payload: {
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
    callType?: CallType;
  }) => {
    if (payload.fromUserId !== this.options.peerId || !this.peerConnection) {
      return;
    }

    try {
      await this.applyOffer(payload.sdp);
    } catch {
      this.options.onError("Could not connect the call.");
      this.end(false);
    }
  };

  private handleAnswer = async (payload: {
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
  }) => {
    if (payload.fromUserId !== this.options.peerId || !this.peerConnection) {
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(payload.sdp),
      );
      await this.flushPendingCandidates();
      this.options.onConnected();
    } catch {
      this.options.onError("Could not connect the call.");
      this.end(false);
    }
  };

  private handleIceCandidate = async (payload: {
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    if (payload.fromUserId !== this.options.peerId) {
      return;
    }

    if (!this.peerConnection?.remoteDescription) {
      this.pendingCandidates.push(payload.candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(payload.candidate),
      );
    } catch {
      // Ignore stale candidates after reconnect.
    }
  };

  private async flushPendingCandidates() {
    if (!this.peerConnection) {
      return;
    }

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (!candidate) {
        continue;
      }
      try {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      } catch {
        // Ignore invalid queued candidates.
      }
    }
  }

  private handleRemoteEnd = (payload: { fromUserId: string }) => {
    if (payload.fromUserId !== this.options.peerId) {
      return;
    }
    this.end(false);
  };

  private handleRemoteReject = (payload: { fromUserId: string }) => {
    if (payload.fromUserId !== this.options.peerId) {
      return;
    }
    this.options.onError("Call declined.");
    this.end(false);
  };

  reject() {
    if (this.ended) {
      return;
    }

    this.options.socket.emit("call_reject", {
      peerId: this.options.peerId,
      targetUserId: this.options.peerId,
    });
    this.end(false);
  }

  toggleAudio(): boolean {
    this.audioEnabled = !this.audioEnabled;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = this.audioEnabled;
    });
    return this.audioEnabled;
  }

  toggleVideo(): boolean {
    this.videoEnabled = !this.videoEnabled;
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = this.videoEnabled;
    });
    return this.videoEnabled;
  }

  isAudioEnabled() {
    return this.audioEnabled;
  }

  isVideoEnabled() {
    return this.videoEnabled;
  }

  end(notifyPeer = true) {
    if (this.ended) {
      return;
    }
    this.ended = true;

    if (notifyPeer) {
      this.options.socket.emit("call_end", { peerId: this.options.peerId });
    }

    this.options.socket.off("call_offer", this.handleOffer);
    this.options.socket.off("call_answer", this.handleAnswer);
    this.options.socket.off("ice_candidate", this.handleIceCandidate);
    this.options.socket.off("call_end", this.handleRemoteEnd);
    this.options.socket.off("call_rejected", this.handleRemoteReject);
    this.options.socket.off("call_ended", this.handleRemoteEnd);

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.localStream = null;
    this.peerConnection = null;
    this.options.onEnded();
  }
}

export type IncomingCallPayload = {
  fromUserId: string;
  sdp: RTCSessionDescriptionInit;
  callType: CallType;
};
