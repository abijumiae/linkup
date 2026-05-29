"use client";

import { Socket } from "socket.io-client";
import { CallType, isWebRTCSupported } from "./webrtc";

export type GroupCallRoomType = "chat" | "hub" | "happening";

export type GroupCallParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  callType: CallType;
};

export interface GroupCallSessionOptions {
  socket: Socket;
  localUserId: string;
  roomType: GroupCallRoomType;
  roomId: string;
  callType: CallType;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onRemoteRemoved: (userId: string) => void;
  onParticipants: (participants: GroupCallParticipant[]) => void;
  onParticipantJoined: (participant: GroupCallParticipant) => void;
  onConnected: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

type PeerState = {
  connection: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
};

export class GroupCallSession {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly options: GroupCallSessionOptions;
  private ended = false;
  private audioEnabled = true;
  private videoEnabled = true;

  constructor(options: GroupCallSessionOptions) {
    this.options = options;
    this.videoEnabled = options.callType === "video";
  }

  async join() {
    if (!isWebRTCSupported()) {
      this.options.onError("Calls are not supported on this browser.");
      this.leave(false);
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.options.callType === "video",
      });
      this.options.onLocalStream(this.localStream);

      this.options.socket.on("group_call_participants", this.onParticipants);
      this.options.socket.on("group_call_user_joined", this.onUserJoined);
      this.options.socket.on("group_call_user_left", this.onUserLeft);
      this.options.socket.on("group_call_offer", this.onOffer);
      this.options.socket.on("group_call_answer", this.onAnswer);
      this.options.socket.on("group_ice_candidate", this.onIceCandidate);
      this.options.socket.on("group_call_ended", this.onCallEnded);
      this.options.socket.on("group_call_error", this.onCallError);

      this.options.socket.emit("group_call_join", {
        roomType: this.options.roomType,
        roomId: this.options.roomId,
        callType: this.options.callType,
      });
    } catch {
      this.options.onError(
        "Camera or microphone permission is required to join this call.",
      );
      this.leave(false);
    }
  }

  private onParticipants = async (payload: {
    roomId: string;
    participants: GroupCallParticipant[];
  }) => {
    if (payload.roomId !== this.options.roomId || this.ended) {
      return;
    }

    this.options.onParticipants(payload.participants);
    this.options.onConnected();

    for (const participant of payload.participants) {
      if (participant.userId === this.options.localUserId) {
        continue;
      }
      if (this.options.localUserId < participant.userId) {
        await this.createOffer(participant.userId);
      }
    }
  };

  private onUserJoined = async (payload: {
    roomId: string;
    user: GroupCallParticipant;
  }) => {
    if (payload.roomId !== this.options.roomId || this.ended) {
      return;
    }

    if (payload.user.userId === this.options.localUserId) {
      return;
    }

    this.options.onParticipantJoined(payload.user);

    if (this.options.localUserId < payload.user.userId) {
      await this.createOffer(payload.user.userId);
    }
  };

  private onUserLeft = (payload: { roomId: string; userId: string }) => {
    if (payload.roomId !== this.options.roomId) {
      return;
    }
    this.removePeer(payload.userId);
  };

  private onOffer = async (payload: {
    roomId: string;
    fromUserId: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    if (payload.roomId !== this.options.roomId || this.ended) {
      return;
    }

    try {
      const pc = this.ensurePeer(payload.fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      await this.flushPendingCandidates(payload.fromUserId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.options.socket.emit("group_call_answer", {
        roomId: this.options.roomId,
        targetUserId: payload.fromUserId,
        answer,
      });
    } catch {
      this.options.onError("Could not connect to a participant.");
    }
  };

  private onAnswer = async (payload: {
    roomId: string;
    fromUserId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    if (payload.roomId !== this.options.roomId || this.ended) {
      return;
    }

    const peer = this.peers.get(payload.fromUserId);
    if (!peer) {
      return;
    }

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription(payload.answer),
      );
      await this.flushPendingCandidates(payload.fromUserId);
    } catch {
      // Ignore stale answers.
    }
  };

  private onIceCandidate = async (payload: {
    roomId: string;
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    if (payload.roomId !== this.options.roomId || this.ended) {
      return;
    }

    const peer = this.peers.get(payload.fromUserId);
    if (!peer) {
      return;
    }

    if (!peer.connection.remoteDescription) {
      peer.pendingCandidates.push(payload.candidate);
      return;
    }

    try {
      await peer.connection.addIceCandidate(
        new RTCIceCandidate(payload.candidate),
      );
    } catch {
      // Ignore invalid candidates.
    }
  };

  private onCallEnded = (payload: { roomId: string }) => {
    if (payload.roomId !== this.options.roomId) {
      return;
    }
    this.leave(false);
  };

  private onCallError = (payload: { message?: string }) => {
    this.options.onError(payload.message ?? "Group call error.");
  };

  private ensurePeer(remoteUserId: string) {
    const existing = this.peers.get(remoteUserId);
    if (existing) {
      return existing.connection;
    }

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.localStream?.getTracks().forEach((track) => {
      connection.addTrack(track, this.localStream!);
    });

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.options.onRemoteStream(remoteUserId, stream);
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.options.socket.emit("group_ice_candidate", {
          roomId: this.options.roomId,
          targetUserId: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.peers.set(remoteUserId, {
      connection,
      pendingCandidates: [],
    });

    return connection;
  }

  private async createOffer(remoteUserId: string) {
    if (this.peers.has(remoteUserId)) {
      return;
    }

    const pc = this.ensurePeer(remoteUserId);
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.options.callType === "video",
    });
    await pc.setLocalDescription(offer);
    this.options.socket.emit("group_call_offer", {
      roomId: this.options.roomId,
      targetUserId: remoteUserId,
      offer,
    });
  }

  private async flushPendingCandidates(remoteUserId: string) {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      return;
    }

    while (peer.pendingCandidates.length > 0) {
      const candidate = peer.pendingCandidates.shift();
      if (!candidate) {
        continue;
      }
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore invalid queued candidates.
      }
    }
  }

  private removePeer(remoteUserId: string) {
    const peer = this.peers.get(remoteUserId);
    if (!peer) {
      return;
    }
    peer.connection.close();
    this.peers.delete(remoteUserId);
    this.options.onRemoteRemoved(remoteUserId);
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

  leave(notifyServer = true) {
    if (this.ended) {
      return;
    }
    this.ended = true;

    if (notifyServer) {
      this.options.socket.emit("group_call_leave", {
        roomType: this.options.roomType,
        roomId: this.options.roomId,
      });
    }

    this.options.socket.off("group_call_participants", this.onParticipants);
    this.options.socket.off("group_call_user_joined", this.onUserJoined);
    this.options.socket.off("group_call_user_left", this.onUserLeft);
    this.options.socket.off("group_call_offer", this.onOffer);
    this.options.socket.off("group_call_answer", this.onAnswer);
    this.options.socket.off("group_ice_candidate", this.onIceCandidate);
    this.options.socket.off("group_call_ended", this.onCallEnded);
    this.options.socket.off("group_call_error", this.onCallError);

    for (const userId of this.peers.keys()) {
      this.removePeer(userId);
    }

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.options.onEnded();
  }
}
