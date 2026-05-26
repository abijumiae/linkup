import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

const userSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const messageInclude = {
  sender: {
    select: userSelect,
  },
} satisfies Prisma.MessageInclude;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConversations(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
    });

    const unreadBySender = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        read: false,
      },
      _count: { id: true },
    });

    const unreadMap = new Map(
      unreadBySender.map((row) => [row.senderId, row._count.id]),
    );

    const conversations = new Map<
      string,
      {
        user: (typeof messages)[0]['sender'];
        lastMessage: {
          id: string;
          content: string;
          createdAt: Date;
          senderId: string;
        };
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const otherUser =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          user: otherUser,
          lastMessage: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
          },
          unreadCount: unreadMap.get(otherUser.id) ?? 0,
        });
      }
    }

    return Array.from(conversations.values()).sort(
      (a, b) =>
        b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
  }

  async getConversation(currentUserId: string, otherUserId: string) {
    if (currentUserId === otherUserId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: userSelect,
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        read: false,
      },
      data: { read: true },
    });

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: messageInclude,
    });

    return { user: otherUser, messages };
  }

  async sendMessage(
    senderId: string,
    receiverId: string,
    dto: CreateMessageDto,
  ) {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    const message = await this.prisma.message.create({
      data: {
        content: dto.content.trim(),
        senderId,
        receiverId,
      },
      include: messageInclude,
    });

    if (dto.marketplaceItemId) {
      await this.notificationsService.notifyMarketplaceInquiry(
        senderId,
        receiverId,
        dto.marketplaceItemId,
      );
    }

    return message;
  }
}
