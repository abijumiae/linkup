export type LiveRoomType = 'hub' | 'happening' | 'chat';

export type LiveRoomParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export function liveRoomKey(roomType: LiveRoomType, roomId: string): string {
  return `live:${roomType}:${roomId}`;
}

export class LiveRoomManager {
  private readonly rooms = new Map<string, Map<string, LiveRoomParticipant>>();

  join(roomKey: string, participant: LiveRoomParticipant) {
    if (!this.rooms.has(roomKey)) {
      this.rooms.set(roomKey, new Map());
    }
    this.rooms.get(roomKey)!.set(participant.userId, participant);
  }

  leave(roomKey: string, userId: string): LiveRoomParticipant | null {
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

  getParticipants(roomKey: string): LiveRoomParticipant[] {
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
}
