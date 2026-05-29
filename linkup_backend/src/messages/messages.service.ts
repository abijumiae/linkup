import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
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

const groupMessageInclude = {
  sender: {
    select: userSelect,
  },
} satisfies Prisma.GroupMessageInclude;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
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

    this.chatGateway.emitMessagesRead(currentUserId, otherUserId);

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

    this.chatGateway.emitDirectMessage(message);
    this.notificationsService.emitDirectMessageAlert(message);

    return message;
  }

  async getGroupMessages(groupId: string, userId: string) {
    await this.ensureGroupMember(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Hub not found');
    }

    const messages = await this.prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: groupMessageInclude,
    });

    return { group, messages };
  }

  async sendGroupMessage(groupId: string, senderId: string, content: string) {
    await this.ensureGroupMember(groupId, senderId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message content is required');
    }

    const message = await this.prisma.groupMessage.create({
      data: {
        content: trimmed,
        groupId,
        senderId,
      },
      include: groupMessageInclude,
    });

    this.chatGateway.emitGroupMessage(message);

    return message;
  }

  async getGroupChatList(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            coverImage: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    const results = await Promise.all(
      memberships.map(async (membership) => {
        const lastMessage = await this.prisma.groupMessage.findFirst({
          where: { groupId: membership.groupId },
          orderBy: { createdAt: 'desc' },
          include: groupMessageInclude,
        });

        return {
          group: membership.group,
          membersCount: membership.group._count.members,
          lastMessage,
        };
      }),
    );

    return results
      .filter((item) => item.lastMessage)
      .sort(
        (a, b) =>
          (b.lastMessage?.createdAt.getTime() ?? 0) -
          (a.lastMessage?.createdAt.getTime() ?? 0),
      );
  }

  private async ensureGroupMember(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must join this hub to access chat');
    }
  }
}
