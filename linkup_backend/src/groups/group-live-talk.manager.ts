export type LiveTalkSocketParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isMuted: boolean;
};

export function groupLiveTalkSocketRoom(
  groupId: string,
  roomId: string,
): string {
  return `group_live_talk:${groupId}:${roomId}`;
}

export class GroupLiveTalkManager {
  private readonly rooms = new Map<
    string,
    Map<string, LiveTalkSocketParticipant>
  >();

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
    if (room.size === 0) {
      this.rooms.delete(roomKey);
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

  isRoomActive(roomKey: string): boolean {
    return (this.rooms.get(roomKey)?.size ?? 0) > 0;
  }
}
