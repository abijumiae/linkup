import { Injectable } from '@nestjs/common';

export type LiveTalkSocketParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isMuted: boolean;
  handRaised: boolean;
};

export function groupLiveTalkSocketRoom(
  groupId: string,
  roomId: string,
): string {
  return `group_live_talk:${groupId}:${roomId}`;
}

@Injectable()
export class GroupLiveTalkManager {
  private readonly rooms = new Map<
    string,
    Map<string, LiveTalkSocketParticipant>
  >();
  private readonly speakingByRoom = new Map<string, Set<string>>();

  join(
    roomKey: string,
    participant: LiveTalkSocketParticipant,
  ): LiveTalkSocketParticipant[] {
    if (!this.rooms.has(roomKey)) {
      this.rooms.set(roomKey, new Map());
    }
    this.rooms.get(roomKey)!.set(participant.userId, participant);
    return this.getParticipants(roomKey);
  }

  leave(roomKey: string, userId: string): LiveTalkSocketParticipant | null {
    const room = this.rooms.get(roomKey);
    if (!room) {
      return null;
    }

    const removed = room.get(userId) ?? null;
    room.delete(userId);
    this.speakingByRoom.get(roomKey)?.delete(userId);
    if (room.size === 0) {
      this.rooms.delete(roomKey);
      this.speakingByRoom.delete(roomKey);
    }
    return removed;
  }

  getParticipants(roomKey: string): LiveTalkSocketParticipant[] {
    const room = this.rooms.get(roomKey);
    if (!room) {
      return [];
    }
    return Array.from(room.values());
  }

  getSpeakingUserIds(roomKey: string): string[] {
    const set = this.speakingByRoom.get(roomKey);
    if (!set) {
      return [];
    }
    return Array.from(set);
  }

  setSpeaking(roomKey: string, userId: string, speaking: boolean): void {
    if (!this.speakingByRoom.has(roomKey)) {
      this.speakingByRoom.set(roomKey, new Set());
    }
    const set = this.speakingByRoom.get(roomKey)!;
    if (speaking) {
      set.add(userId);
    } else {
      set.delete(userId);
    }
    if (set.size === 0) {
      this.speakingByRoom.delete(roomKey);
    }
  }

  findRoomKeyForUser(userId: string): string | null {
    for (const [roomKey, room] of this.rooms.entries()) {
      if (room.has(userId)) {
        return roomKey;
      }
    }
    return null;
  }

  setMuted(roomKey: string, userId: string, isMuted: boolean): boolean {
    const room = this.rooms.get(roomKey);
    const participant = room?.get(userId);
    if (!participant) {
      return false;
    }
    participant.isMuted = isMuted;
    return true;
  }

  setHandRaised(roomKey: string, userId: string, handRaised: boolean): boolean {
    const room = this.rooms.get(roomKey);
    const participant = room?.get(userId);
    if (!participant) {
      return false;
    }
    participant.handRaised = handRaised;
    return true;
  }

  isRoomActive(roomKey: string): boolean {
    return (this.rooms.get(roomKey)?.size ?? 0) > 0;
  }

  hasUser(roomKey: string, userId: string): boolean {
    return this.rooms.get(roomKey)?.has(userId) ?? false;
  }

  clearRoom(roomKey: string): void {
    this.rooms.delete(roomKey);
    this.speakingByRoom.delete(roomKey);
  }
}
