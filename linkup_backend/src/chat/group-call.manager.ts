export type GroupCallRoomType = 'chat' | 'hub' | 'happening';

export type GroupCallParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  callType: 'audio' | 'video';
};

export function groupCallRoomKey(
  roomType: GroupCallRoomType,
  roomId: string,
): string {
  const prefix =
    roomType === 'chat'
      ? 'group-chat'
      : roomType === 'hub'
        ? 'hub-call'
        : 'happening-call';
  return `${prefix}:${roomId}`;
}

export class GroupCallManager {
  private readonly rooms = new Map<string, Map<string, GroupCallParticipant>>();

  join(roomKey: string, participant: GroupCallParticipant) {
    if (!this.rooms.has(roomKey)) {
      this.rooms.set(roomKey, new Map());
    }
    this.rooms.get(roomKey)!.set(participant.userId, participant);
  }

  leave(roomKey: string, userId: string): GroupCallParticipant | null {
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

  getParticipants(roomKey: string): GroupCallParticipant[] {
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

  isRoomActive(roomKey: string): boolean {
    return (this.rooms.get(roomKey)?.size ?? 0) > 0;
  }
}
