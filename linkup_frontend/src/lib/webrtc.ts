"use client";

import { Socket } from "socket.io-client";

export type CallType = "audio" | "video";

export interface CallSessionOptions {
  socket: Socket;
  localUserId: string;
  peerId: string;
  callType: CallType;
  isInitiator: boolean;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class CallSession {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private readonly options: CallSessionOptions;
  private ended = false;

  constructor(options: CallSessionOptions) {
    this.options = options;
  }

  async start() {
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
        }
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.options.socket.emit("call:ice-candidate", {
            peerId: this.options.peerId,
            candidate: event.candidate,
          });
        }
      };

      this.options.socket.on("call:offer", this.handleOffer);
      this.options.socket.on("call:answer", this.handleAnswer);
      this.options.socket.on("call:ice-candidate", this.handleIceCandidate);
      this.options.socket.on("call:end", this.handleRemoteEnd);
      this.options.socket.on("call:decline", this.handleRemoteEnd);

      if (this.options.isInitiator) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.options.socket.emit("call:offer", {
          peerId: this.options.peerId,
          sdp: offer,
          callType: this.options.callType,
        });
      }
    } catch {
      this.options.onError("Could not access camera or microphone.");
      this.end();
    }
  }

  private handleOffer = async (payload: {
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
    callType?: CallType;
  }) => {
    if (payload.fromUserId !== this.options.peerId || !this.peerConnection) {
      return;
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(payload.sdp),
    );
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.options.socket.emit("call:answer", {
      peerId: this.options.peerId,
      sdp: answer,
    });
  };

  private handleAnswer = async (payload: {
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
  }) => {
    if (payload.fromUserId !== this.options.peerId || !this.peerConnection) {
      return;
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(payload.sdp),
    );
  };

  private handleIceCandidate = async (payload: {
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    if (payload.fromUserId !== this.options.peerId || !this.peerConnection) {
      return;
    }

    await this.peerConnection.addIceCandidate(
      new RTCIceCandidate(payload.candidate),
    );
  };

  private handleRemoteEnd = (payload: { fromUserId: string }) => {
    if (payload.fromUserId !== this.options.peerId) {
      return;
    }
    this.end();
  };

  decline() {
    this.options.socket.emit("call:decline", { peerId: this.options.peerId });
    this.end();
  }

  end() {
    if (this.ended) {
      return;
    }
    this.ended = true;

    this.options.socket.off("call:offer", this.handleOffer);
    this.options.socket.off("call:answer", this.handleAnswer);
    this.options.socket.off("call:ice-candidate", this.handleIceCandidate);
    this.options.socket.off("call:end", this.handleRemoteEnd);
    this.options.socket.off("call:decline", this.handleRemoteEnd);

    if (this.options.isInitiator) {
      this.options.socket.emit("call:end", { peerId: this.options.peerId });
    }

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.localStream = null;
    this.peerConnection = null;
    this.options.onEnded();
  }
}
