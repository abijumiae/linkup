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
      await this.persistOnlineStatus(userId, false);
      await this.broadcastOffline(userId);
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
    if (this.isConnected(userId)) {
      return;
    }

    await this.persistOnlineStatus(userId, false);
    await this.broadcastOffline(userId);
  }

  isConnected(userId: string): boolean {
    const sockets = this.connectedSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.connectedSockets.keys());
  }

  async getVisibleOnlineUserIds(): Promise<string[]> {
    const [connectedIds, persistedUsers] = await Promise.all([
      Promise.resolve(this.getConnectedUserIds()),
      this.prisma.user.findMany({
        where: {
          online: true,
          showOnlineStatus: true,
        },
        select: { id: true },
      }),
    ]);

    const visibleIds = new Set<string>();
    for (const userId of connectedIds) {
      if (await this.canShowOnlineStatus(userId)) {
        visibleIds.add(userId);
      }
    }
    for (const user of persistedUsers) {
      visibleIds.add(user.id);
    }

    return Array.from(visibleIds);
  }

  private async persistOnlineStatus(userId: string, online: boolean) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { online },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist online=${online} for userId=${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
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

  private async broadcastOffline(userId: string) {
    if (!(await this.canShowOnlineStatus(userId))) {
      return;
    }

    this.realtimeEmitter.emitUserOffline(userId);
  }
}
