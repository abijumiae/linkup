"use client";

import { Socket } from "socket.io-client";
import { isWebRTCSupported } from "./webrtc";

export type LiveTalkSocketParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isMuted: boolean;
  handRaised: boolean;
};

export interface GroupLiveTalkSessionOptions {
  socket: Socket;
  localUserId: string;
  groupId: string;
  roomId: string;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onRemoteRemoved: (userId: string) => void;
  onParticipants: (participants: LiveTalkSocketParticipant[]) => void;
  onParticipantJoined: (participant: LiveTalkSocketParticipant) => void;
  onParticipantLeft: (userId: string) => void;
  onMuteChanged: (userId: string, isMuted: boolean) => void;
  onHandChanged?: (userId: string, handRaised: boolean) => void;
  onRemoteSpeaking?: (userId: string, speaking: boolean) => void;
  onConnected: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onSpeaking?: (userId: string, speaking: boolean) => void;
}

/** STUN only for MVP. TURN server required for reliable calls behind strict networks. */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

type PeerState = {
  connection: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
  analyser?: AnalyserNode;
  animationId?: number;
};

export class GroupLiveTalkSession {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly options: GroupLiveTalkSessionOptions;
  private ended = false;
  private muted = false;
  private audioContext: AudioContext | null = null;

  constructor(options: GroupLiveTalkSessionOptions) {
    this.options = options;
  }

  async join() {
    if (!isWebRTCSupported()) {
      this.options.onError("Live Talk is not supported on this browser.");
      this.leave(false);
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.setupLocalSpeakingMonitor();

      this.bindSocketListeners();
      this.options.socket.emit("live_talk_join", {
        groupId: this.options.groupId,
        roomId: this.options.roomId,
      });
    } catch {
      this.options.onError(
        "Could not access microphone. Please allow microphone permission.",
      );
      this.leave(false);
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  private bindSocketListeners() {
    this.options.socket.on("live_talk_participants", this.onParticipants);
    this.options.socket.on(
      "live_talk_participant_joined",
      this.onParticipantJoined,
    );
    this.options.socket.on(
      "live_talk_participant_left",
      this.onParticipantLeft,
    );
    this.options.socket.on("live_talk_offer", this.onOffer);
    this.options.socket.on("live_talk_answer", this.onAnswer);
    this.options.socket.on("live_talk_ice_candidate", this.onIceCandidate);
    this.options.socket.on("live_talk_mute_changed", this.onMuteChanged);
    this.options.socket.on("live_talk_hand_raised", this.onHandRaised);
    this.options.socket.on("live_talk_hand_lowered", this.onHandLowered);
    this.options.socket.on(
      "live_talk_speaking_changed",
      this.onSpeakingChanged,
    );
    this.options.socket.on("live_talk_ended", this.onEndedEvent);
    this.options.socket.on("live_talk_error", this.onLiveTalkError);
  }

  private unbindSocketListeners() {
    this.options.socket.off("live_talk_participants", this.onParticipants);
    this.options.socket.off(
      "live_talk_participant_joined",
      this.onParticipantJoined,
    );
    this.options.socket.off(
      "live_talk_participant_left",
      this.onParticipantLeft,
    );
    this.options.socket.off("live_talk_offer", this.onOffer);
    this.options.socket.off("live_talk_answer", this.onAnswer);
    this.options.socket.off("live_talk_ice_candidate", this.onIceCandidate);
    this.options.socket.off("live_talk_mute_changed", this.onMuteChanged);
    this.options.socket.off("live_talk_hand_raised", this.onHandRaised);
    this.options.socket.off("live_talk_hand_lowered", this.onHandLowered);
    this.options.socket.off(
      "live_talk_speaking_changed",
      this.onSpeakingChanged,
    );
    this.options.socket.off("live_talk_ended", this.onEndedEvent);
    this.options.socket.off("live_talk_error", this.onLiveTalkError);
  }

  private onParticipants = async (payload: {
    groupId: string;
    roomId: string;
    participants: LiveTalkSocketParticipant[];
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
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

  private onParticipantJoined = async (payload: {
    groupId: string;
    roomId: string;
    participant: LiveTalkSocketParticipant;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
      return;
    }

    if (payload.participant.userId === this.options.localUserId) {
      return;
    }

    this.options.onParticipantJoined(payload.participant);

    if (this.options.localUserId < payload.participant.userId) {
      await this.createOffer(payload.participant.userId);
    }
  };

  private onParticipantLeft = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.removePeer(payload.userId);
    this.options.onParticipantLeft(payload.userId);
  };

  private onMuteChanged = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
    isMuted: boolean;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.options.onMuteChanged(payload.userId, payload.isMuted);
  };

  private onHandRaised = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.options.onHandChanged?.(payload.userId, true);
  };

  private onHandLowered = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.options.onHandChanged?.(payload.userId, false);
  };

  private onSpeakingChanged = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
    speaking: boolean;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.options.onRemoteSpeaking?.(payload.userId, payload.speaking);
    if (payload.userId === this.options.localUserId) {
      return;
    }
    this.options.onSpeaking?.(payload.userId, payload.speaking);
  };

  private onEndedEvent = (payload: { groupId: string; roomId: string }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId
    ) {
      return;
    }
    this.leave(false);
  };

  private onLiveTalkError = (payload: { message?: string }) => {
    this.options.onError(payload.message ?? "Could not join Live Talk.");
  };

  private onOffer = async (payload: {
    groupId: string;
    roomId: string;
    fromUserId: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
      return;
    }

    try {
      const pc = this.ensurePeer(payload.fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      await this.flushPendingCandidates(payload.fromUserId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.options.socket.emit("live_talk_answer", {
        groupId: this.options.groupId,
        roomId: this.options.roomId,
        targetUserId: payload.fromUserId,
        answer,
      });
    } catch {
      this.options.onError("Connection lost. Reconnecting...");
    }
  };

  private onAnswer = async (payload: {
    groupId: string;
    roomId: string;
    fromUserId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
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
    groupId: string;
    roomId: string;
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
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
        this.setupRemoteSpeakingMonitor(remoteUserId, stream);
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.options.socket.emit("live_talk_ice_candidate", {
          groupId: this.options.groupId,
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
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);
    this.options.socket.emit("live_talk_offer", {
      groupId: this.options.groupId,
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
    if (peer.animationId) {
      cancelAnimationFrame(peer.animationId);
    }
    peer.connection.close();
    this.peers.delete(remoteUserId);
    this.options.onRemoteRemoved(remoteUserId);
  }

  private setupLocalSpeakingMonitor() {
    if (!this.localStream || !this.options.onSpeaking) {
      return;
    }
    this.monitorSpeaking(this.options.localUserId, this.localStream);
  }

  private setupRemoteSpeakingMonitor(userId: string, stream: MediaStream) {
    if (!this.options.onSpeaking) {
      return;
    }
    this.monitorSpeaking(userId, stream);
  }

  private monitorSpeaking(userId: string, stream: MediaStream) {
    if (!this.options.onSpeaking) {
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const peer = this.peers.get(userId);
      if (peer) {
        peer.analyser = analyser;
      }

      const data = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const next = avg > 18 && !this.muted;
        if (next !== speaking) {
          speaking = next;
          this.options.onSpeaking?.(userId, speaking);
          this.options.socket.emit("live_talk_speaking_changed", {
            groupId: this.options.groupId,
            roomId: this.options.roomId,
            speaking: next,
          });
        }
        const state = this.peers.get(userId);
        if (state?.analyser === analyser && !this.ended) {
          state.animationId = requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    } catch {
      // Speaking indicator is optional.
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    this.options.socket.emit("live_talk_mute_changed", {
      groupId: this.options.groupId,
      roomId: this.options.roomId,
      isMuted: muted,
    });
  }

  /** Push-to-talk: temporarily unmute while held (does not change mute toggle state). */
  setPushToTalk(active: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = active ? true : !this.muted;
    });
  }

  isMuted() {
    return this.muted;
  }

  leave(notifyServer = true) {
    if (this.ended) {
      return;
    }
    this.ended = true;

    if (notifyServer) {
      this.options.socket.emit("live_talk_leave", {
        groupId: this.options.groupId,
        roomId: this.options.roomId,
      });
    }

    this.unbindSocketListeners();

    for (const userId of [...this.peers.keys()]) {
      this.removePeer(userId);
    }

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    void this.audioContext?.close();
    this.audioContext = null;

    this.options.onEnded();
  }
}
