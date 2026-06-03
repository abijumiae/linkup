"use client";

import { Socket } from "socket.io-client";
import { buildIceServers, ltDebug, mapGetUserMediaError } from "./webrtcConfig";
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
  onMicOpened?: (userId: string) => void;
  onMicReleased?: (userId: string) => void;
  onAudioConnecting?: (userId: string) => void;
}

type PeerState = {
  connection: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
  analyser?: AnalyserNode;
  animationId?: number;
};

export class GroupLiveTalkSession {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly participantIds = new Set<string>();
  private readonly options: GroupLiveTalkSessionOptions;
  private ended = false;
  private muted = true;
  private audioContext: AudioContext | null = null;
  private activeMicUserId: string | null = null;

  constructor(options: GroupLiveTalkSessionOptions) {
    this.options = options;
  }

  async join() {
    if (!isWebRTCSupported()) {
      this.options.onError("Live Talk is not supported in this browser.");
      this.leave(false);
      return;
    }

    this.bindSocketListeners();
    this.options.socket.emit("live_talk_join", {
      groupId: this.options.groupId,
      roomId: this.options.roomId,
    });
    ltDebug("live_talk_join emitted", {
      groupId: this.options.groupId,
      roomId: this.options.roomId,
    });
  }

  async reconnect() {
    if (!isWebRTCSupported()) {
      this.options.onError("Live Talk is not supported in this browser.");
      this.leave(false);
      return;
    }

    this.bindSocketListeners();
    this.options.socket.emit("live_talk_reconnect", {
      groupId: this.options.groupId,
      roomId: this.options.roomId,
    });
    ltDebug("live_talk_reconnect emitted", {
      groupId: this.options.groupId,
      roomId: this.options.roomId,
    });
  }

  /**
   * Request microphone only after user taps Open Mic (never on page load).
   */
  async openMicAudio() {
    if (!isWebRTCSupported()) {
      throw new Error("Live Talk is not supported in this browser.");
    }

    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        ltDebug("getUserMedia success", {
          tracks: this.localStream.getAudioTracks().length,
        });
      }

      const tracks = this.localStream.getAudioTracks();
      if (tracks.length === 0) {
        throw new Error("No microphone found.");
      }

      this.muted = false;
      tracks.forEach((track) => {
        track.enabled = true;
      });

      this.activeMicUserId = this.options.localUserId;
      this.setupLocalSpeakingMonitor();
      await this.publishAudioToListeners();
    } catch (err) {
      ltDebug("getUserMedia failed", {
        name: err instanceof DOMException ? err.name : "unknown",
      });
      throw new Error(mapGetUserMediaError(err));
    }
  }

  releaseMicAudio() {
    this.muted = true;
    this.activeMicUserId = null;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    if (this.options.onSpeaking) {
      this.options.onSpeaking(this.options.localUserId, false);
    }
    ltDebug("mic released locally");
  }

  setActiveMicHolder(userId: string | null) {
    const previous = this.activeMicUserId;
    this.activeMicUserId = userId;

    if (
      previous &&
      previous !== userId &&
      previous !== this.options.localUserId
    ) {
      this.removePeer(previous);
    }

    if (!userId || userId === this.options.localUserId) {
      return;
    }

    ltDebug("listening for active speaker", { speakerId: userId });
  }

  /** Speaker sends WebRTC offers to every listener in the room. */
  async publishAudioToListeners() {
    if (
      this.activeMicUserId !== this.options.localUserId ||
      !this.localStream ||
      this.muted
    ) {
      return;
    }

    const listeners = [...this.participantIds].filter(
      (id) => id !== this.options.localUserId,
    );

    ltDebug("publish audio to listeners", { count: listeners.length });

    for (const userId of listeners) {
      if (this.peers.has(userId)) {
        this.removePeer(userId);
      }
      this.options.onAudioConnecting?.(userId);
      try {
        await this.createOffer(userId);
        ltDebug("offer sent", { targetUserId: userId });
      } catch {
        ltDebug("offer failed", { targetUserId: userId });
      }
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  private trackParticipants(list: LiveTalkSocketParticipant[]) {
    this.participantIds.clear();
    for (const p of list) {
      if (p.userId) {
        this.participantIds.add(p.userId);
      }
    }
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
    this.options.socket.on("user_speaking", this.onSpeakingChanged);
    this.options.socket.on("live_talk_mic_opened", this.onMicOpened);
    this.options.socket.on("live_talk_mic_released", this.onMicReleased);
    this.options.socket.on("live_talk_mic_passed", this.onMicPassed);
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
    this.options.socket.off("user_speaking", this.onSpeakingChanged);
    this.options.socket.off("live_talk_mic_opened", this.onMicOpened);
    this.options.socket.off("live_talk_mic_released", this.onMicReleased);
    this.options.socket.off("live_talk_mic_passed", this.onMicPassed);
    this.options.socket.off("live_talk_ended", this.onEndedEvent);
    this.options.socket.off("live_talk_error", this.onLiveTalkError);
  }

  private onMicOpened = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
      return;
    }

    this.setActiveMicHolder(payload.userId);
    this.options.onMicOpened?.(payload.userId);

    if (payload.userId === this.options.localUserId) {
      void this.publishAudioToListeners();
    }
  };

  private onMicReleased = (payload: {
    groupId: string;
    roomId: string;
    userId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
      return;
    }

    if (payload.userId === this.options.localUserId) {
      this.releaseMicAudio();
    } else {
      this.removePeer(payload.userId);
    }
    this.setActiveMicHolder(null);
    this.options.onMicReleased?.(payload.userId);
  };

  private onMicPassed = (payload: {
    groupId: string;
    roomId: string;
    toUserId: string;
  }) => {
    if (
      payload.groupId !== this.options.groupId ||
      payload.roomId !== this.options.roomId ||
      this.ended
    ) {
      return;
    }

    if (payload.toUserId === this.options.localUserId) {
      void this.openMicAudio();
    } else {
      this.setActiveMicHolder(payload.toUserId);
    }
  };

  private onParticipants = (payload: {
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

    this.trackParticipants(payload.participants);
    this.options.onParticipants(payload.participants);
    this.options.onConnected();
    ltDebug("participants snapshot", { count: payload.participants.length });
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

    this.participantIds.add(payload.participant.userId);
    this.options.onParticipantJoined(payload.participant);

    if (this.activeMicUserId === this.options.localUserId) {
      this.options.onAudioConnecting?.(payload.participant.userId);
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
    this.participantIds.delete(payload.userId);
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

    ltDebug("offer received", { fromUserId: payload.fromUserId });

    try {
      const pc = this.ensurePeer(payload.fromUserId, {
        sendLocalAudio:
          this.activeMicUserId === this.options.localUserId && !this.muted,
      });
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
      ltDebug("answer sent", { targetUserId: payload.fromUserId });
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

    ltDebug("answer received", { fromUserId: payload.fromUserId });

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription(payload.answer),
      );
      await this.flushPendingCandidates(payload.fromUserId);
    } catch {
      ltDebug("stale answer ignored", { fromUserId: payload.fromUserId });
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
      ltDebug("ICE candidate added", { fromUserId: payload.fromUserId });
    } catch {
      ltDebug("ICE candidate ignored", { fromUserId: payload.fromUserId });
    }
  };

  private ensurePeer(
    remoteUserId: string,
    opts: { sendLocalAudio: boolean } = { sendLocalAudio: false },
  ) {
    const existing = this.peers.get(remoteUserId);
    if (existing) {
      return existing.connection;
    }

    const connection = new RTCPeerConnection({ iceServers: buildIceServers() });

    const shouldSend =
      opts.sendLocalAudio &&
      this.localStream &&
      this.activeMicUserId === this.options.localUserId &&
      !this.muted;

    if (shouldSend) {
      this.localStream!.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
      ltDebug("peer connection created with local audio", { remoteUserId });
    } else {
      connection.addTransceiver("audio", { direction: "recvonly" });
      ltDebug("peer connection created receive-only", { remoteUserId });
    }

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        ltDebug("remote track received", { remoteUserId });
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
        ltDebug("ICE candidate sent", { targetUserId: remoteUserId });
      }
    };

    connection.onconnectionstatechange = () => {
      ltDebug("peer connection state", {
        remoteUserId,
        state: connection.connectionState,
      });
    };

    this.peers.set(remoteUserId, {
      connection,
      pendingCandidates: [],
    });

    return connection;
  }

  private async createOffer(remoteUserId: string) {
    if (this.activeMicUserId !== this.options.localUserId) {
      return;
    }

    if (this.peers.has(remoteUserId)) {
      this.removePeer(remoteUserId);
    }

    const pc = this.ensurePeer(remoteUserId, { sendLocalAudio: true });
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
        const next =
          avg > 18 &&
          (userId === this.options.localUserId
            ? !this.muted && this.activeMicUserId === this.options.localUserId
            : true);
        if (next !== speaking) {
          speaking = next;
          this.options.onSpeaking?.(userId, speaking);
          if (userId === this.options.localUserId) {
            this.options.socket.emit("live_talk_speaking_changed", {
              groupId: this.options.groupId,
              roomId: this.options.roomId,
              speaking: next,
            });
          }
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
    if (this.activeMicUserId !== this.options.localUserId) {
      return;
    }
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

    this.releaseMicAudio();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.activeMicUserId = null;
    this.participantIds.clear();

    void this.audioContext?.close();
    this.audioContext = null;

    this.options.onEnded();
  }
}
