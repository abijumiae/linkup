import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEmitter } from './realtime.emitter';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly connectedSockets = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async registerConnection(userId: string, socketId: string): Promise<void> {
    if (!this.connectedSockets.has(userId)) {
      this.connectedSockets.set(userId, new Set());
    }

    const sockets = this.connectedSockets.get(userId)!;
    const wasConnected = sockets.size > 0;
    sockets.add(socketId);

    await this.touchLastSeen(userId);

    if (!wasConnected) {
      await this.persistOnlineStatus(userId, true);
      await this.broadcastOnline(userId);
    }
  }

  async unregisterConnection(userId: string, socketId: string): Promise<void> {
    const sockets = this.connectedSockets.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.connectedSockets.delete(userId);
      const lastSeenAt = await this.persistOnlineStatus(userId, false);
      await this.broadcastOffline(userId, lastSeenAt);
    }
  }

  async markOnline(userId: string): Promise<void> {
    if (this.isConnected(userId)) {
      return;
    }

    await this.persistOnlineStatus(userId, true);
    await this.broadcastOnline(userId);
  }

  async markOffline(userId: string): Promise<void> {
    this.connectedSockets.delete(userId);

    const lastSeenAt = await this.persistOnlineStatus(userId, false);
    await this.broadcastOffline(userId, lastSeenAt);
  }

  isConnected(userId: string): boolean {
    const sockets = this.connectedSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.connectedSockets.keys());
  }

  async getVisibleOnlineUserIds(): Promise<string[]> {
    const snapshot = await this.getOnlineStatusSnapshot();
    return snapshot.onlineUserIds;
  }

  async getOnlineStatusSnapshot(): Promise<{
    onlineUserIds: string[];
    users: { id: string; online: boolean; lastSeenAt: string | null }[];
  }> {
    const connectedIds = this.getConnectedUserIds();
    const connectedSet = new Set<string>();

    for (const userId of connectedIds) {
      if (await this.canShowOnlineStatus(userId)) {
        connectedSet.add(userId);
      }
    }

    const ids = Array.from(connectedSet);
    if (ids.length === 0) {
      return { onlineUserIds: [], users: [] };
    }

    const rows = await this.prisma.user.findMany({
      where: {
        id: { in: ids },
        showOnlineStatus: true,
      },
      select: {
        id: true,
        online: true,
        lastSeenAt: true,
      },
    });

    const users = rows.map((row) => ({
      id: row.id,
      online: true,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    }));

    return { onlineUserIds: users.map((row) => row.id), users };
  }

  private async touchLastSeen(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update lastSeenAt for userId=${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async persistOnlineStatus(
    userId: string,
    online: boolean,
  ): Promise<Date | null> {
    const lastSeenAt = new Date();
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { online, lastSeenAt },
      });
      return lastSeenAt;
    } catch (error) {
      this.logger.warn(
        `Failed to persist online=${online} for userId=${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private async canShowOnlineStatus(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { showOnlineStatus: true },
    });

    return user?.showOnlineStatus !== false;
  }

  private async broadcastOnline(userId: string) {
    if (!(await this.canShowOnlineStatus(userId))) {
      return;
    }

    this.realtimeEmitter.emitUserOnline(userId);
  }

  private async broadcastOffline(userId: string, lastSeenAt: Date | null) {
    if (!(await this.canShowOnlineStatus(userId))) {
      return;
    }

    this.realtimeEmitter.emitUserOffline(
      userId,
      lastSeenAt?.toISOString() ?? new Date().toISOString(),
    );
  }
}
