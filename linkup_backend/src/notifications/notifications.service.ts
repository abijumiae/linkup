import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { NotificationType, Prisma } from '../generated/prisma/client';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildChatAlertPayload,
  buildRealtimeAlertPayload,
} from './alert.util';

const actorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const notificationInclude = {
  actor: {
    select: actorSelect,
  },
} satisfies Prisma.NotificationInclude;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeEmitter))
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async notifyLike(actorId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.authorId === actorId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertNotification({
      type: NotificationType.LIKE,
      recipientId: post.authorId,
      actorId,
      postId,
      message: `${actor.name} boosted your Spark`,
    });
  }

  async removeLikeNotification(actorId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return;
    }

    await this.prisma.notification.deleteMany({
      where: {
        type: NotificationType.LIKE,
        recipientId: post.authorId,
        actorId,
        postId,
      },
    });
  }

  async notifyComment(actorId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.authorId === actorId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertNotification({
      type: NotificationType.COMMENT,
      recipientId: post.authorId,
      actorId,
      postId,
      message: `${actor.name} replied to your Spark`,
    });
  }

  async notifyMarketplaceInquiry(
    actorId: string,
    sellerId: string,
    marketplaceItemId: string,
  ) {
    if (actorId === sellerId) {
      return;
    }

    const item = await this.prisma.marketplaceItem.findUnique({
      where: { id: marketplaceItemId },
    });

    if (!item || item.sellerId !== sellerId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertMarketplaceNotification({
      type: NotificationType.MARKETPLACE_INQUIRY,
      recipientId: sellerId,
      actorId,
      marketplaceItemId,
      message: `${actor.name} inquired about your listing "${item.title}"`,
    });
  }

  async notifyEventJoin(actorId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event || event.organizerId === actorId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertEventNotification({
      type: NotificationType.EVENT_JOIN,
      recipientId: event.organizerId,
      actorId,
      eventId,
      message: `${actor.name} is going to your event "${event.title}"`,
    });
  }

  async notifyJobApplication(actorId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.posterId === actorId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertJobNotification({
      type: NotificationType.JOB_APPLICATION,
      recipientId: job.posterId,
      actorId,
      jobId,
      message: `${actor.name} applied to your job "${job.title}"`,
    });
  }

  async notifyGroupJoin(actorId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!group || group.ownerId === actorId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertGroupNotification({
      type: NotificationType.GROUP_JOIN,
      recipientId: group.ownerId,
      actorId,
      groupId,
      message: `${actor.name} joined your group "${group.name}"`,
    });
  }

  async notifyFollow(actorId: string, recipientId: string) {
    if (actorId === recipientId) {
      return;
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    if (!actor) {
      return;
    }

    await this.upsertNotification({
      type: NotificationType.FOLLOW,
      recipientId,
      actorId,
      postId: null,
      message: `${actor.name} connected with you`,
    });
  }

  async removeFollowNotification(actorId: string, recipientId: string) {
    await this.prisma.notification.deleteMany({
      where: {
        type: NotificationType.FOLLOW,
        recipientId,
        actorId,
      },
    });
  }

  async getForUser(recipientId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: notificationInclude,
      }),
      this.prisma.notification.count({
        where: { recipientId, read: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(notificationId: string, recipientId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
      include: notificationInclude,
    });
  }

  async markAllAsRead(recipientId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: { read: true },
    });

    return { message: 'All notifications marked as read' };
  }

  emitDirectMessageAlert(message: {
    id: string;
    type?: string;
    senderId: string;
    receiverId: string;
    sender: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
  }) {
    const payload = buildChatAlertPayload({
      messageId: message.id,
      sender: message.sender,
      recipientId: message.receiverId,
      messageText:
        message.type === 'voice'
          ? `${message.sender.name} sent you a voice note`
          : `${message.sender.name} sent you a chat`,
    });
    this.realtimeEmitter.emitAlert(message.receiverId, payload);
    return payload;
  }

  async createAndEmitNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    message: string;
    postId?: string | null;
    groupId?: string;
    marketplaceItemId?: string;
    jobId?: string;
    eventId?: string;
  }) {
    const data: Prisma.NotificationCreateInput = {
      type: params.type,
      message: params.message,
      recipient: { connect: { id: params.recipientId } },
      actor: { connect: { id: params.actorId } },
    };

    if (params.postId) {
      data.post = { connect: { id: params.postId } };
    }
    if (params.groupId) {
      data.group = { connect: { id: params.groupId } };
    }
    if (params.marketplaceItemId) {
      data.marketplaceItem = { connect: { id: params.marketplaceItemId } };
    }
    if (params.jobId) {
      data.job = { connect: { id: params.jobId } };
    }
    if (params.eventId) {
      data.event = { connect: { id: params.eventId } };
    }

    const created = await this.prisma.notification.create({
      data,
      include: notificationInclude,
    });

    this.emitSavedNotification(params.recipientId, created);
    return created;
  }

  private emitSavedNotification(
    recipientId: string,
    notification: Prisma.NotificationGetPayload<{
      include: typeof notificationInclude;
    }>,
  ) {
    const payload = buildRealtimeAlertPayload(notification);
    this.realtimeEmitter.emitAlert(recipientId, payload);
    return payload;
  }

  private async upsertNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    postId: string | null;
    message: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        postId: params.postId,
      },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: params.message,
          read: false,
          createdAt: new Date(),
        },
        include: notificationInclude,
      });
      this.emitSavedNotification(params.recipientId, updated);
      return updated;
    }

    const created = await this.prisma.notification.create({
      data: {
        type: params.type,
        message: params.message,
        recipientId: params.recipientId,
        actorId: params.actorId,
        postId: params.postId,
      },
      include: notificationInclude,
    });
    this.emitSavedNotification(params.recipientId, created);
    return created;
  }

  private async upsertMarketplaceNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    marketplaceItemId: string;
    message: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        marketplaceItemId: params.marketplaceItemId,
      },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: params.message,
          read: false,
          createdAt: new Date(),
        },
        include: notificationInclude,
      });
      this.emitSavedNotification(params.recipientId, updated);
      return updated;
    }

    const created = await this.prisma.notification.create({
      data: {
        type: params.type,
        message: params.message,
        recipientId: params.recipientId,
        actorId: params.actorId,
        marketplaceItemId: params.marketplaceItemId,
      },
      include: notificationInclude,
    });
    this.emitSavedNotification(params.recipientId, created);
    return created;
  }

  private async upsertGroupNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    groupId: string;
    message: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        groupId: params.groupId,
      },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: params.message,
          read: false,
          createdAt: new Date(),
        },
        include: notificationInclude,
      });
      this.emitSavedNotification(params.recipientId, updated);
      return updated;
    }

    const created = await this.prisma.notification.create({
      data: {
        type: params.type,
        message: params.message,
        recipientId: params.recipientId,
        actorId: params.actorId,
        groupId: params.groupId,
      },
      include: notificationInclude,
    });
    this.emitSavedNotification(params.recipientId, created);
    return created;
  }

  private async upsertEventNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    eventId: string;
    message: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        eventId: params.eventId,
      },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: params.message,
          read: false,
          createdAt: new Date(),
        },
        include: notificationInclude,
      });
      this.emitSavedNotification(params.recipientId, updated);
      return updated;
    }

    const created = await this.prisma.notification.create({
      data: {
        type: params.type,
        message: params.message,
        recipientId: params.recipientId,
        actorId: params.actorId,
        eventId: params.eventId,
      },
      include: notificationInclude,
    });
    this.emitSavedNotification(params.recipientId, created);
    return created;
  }

  private async upsertJobNotification(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    jobId: string;
    message: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        jobId: params.jobId,
      },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: params.message,
          read: false,
          createdAt: new Date(),
        },
        include: notificationInclude,
      });
      this.emitSavedNotification(params.recipientId, updated);
      return updated;
    }

    const created = await this.prisma.notification.create({
      data: {
        type: params.type,
        message: params.message,
        recipientId: params.recipientId,
        actorId: params.actorId,
        jobId: params.jobId,
      },
      include: notificationInclude,
    });
    this.emitSavedNotification(params.recipientId, created);
    return created;
  }
}
