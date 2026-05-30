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

const MESSAGE_PAGE_SIZE = 30;
const CONVERSATION_SCAN_LIMIT = 300;

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
      take: CONVERSATION_SCAN_LIMIT,
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
            content:
              message.type === 'voice' ? 'Voice note' : message.content,
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
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE + 1,
      include: messageInclude,
    });

    const hasMore = messages.length > MESSAGE_PAGE_SIZE;
    const page = hasMore ? messages.slice(0, MESSAGE_PAGE_SIZE) : messages;

    return {
      user: otherUser,
      messages: page.reverse(),
      hasMore,
    };
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

    const messageType = dto.type ?? 'text';

    if (messageType === 'voice') {
      if (!dto.mediaUrl) {
        throw new BadRequestException('Voice note media URL is required');
      }
      if (!dto.duration || dto.duration < 1) {
        throw new BadRequestException('Voice note duration is required');
      }
    } else if (!dto.content?.trim()) {
      throw new BadRequestException('Message content is required');
    }

    const message = await this.prisma.message.create({
      data: {
        type: messageType,
        content: dto.content?.trim() ?? '',
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        duration: dto.duration,
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
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE + 1,
      include: groupMessageInclude,
    });

    const hasMore = messages.length > MESSAGE_PAGE_SIZE;
    const page = hasMore ? messages.slice(0, MESSAGE_PAGE_SIZE) : messages;

    return { group, messages: page.reverse(), hasMore };
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

    if (memberships.length === 0) {
      return [];
    }

    const groupIds = memberships.map((membership) => membership.groupId);

    const lastMessages = await this.prisma.groupMessage.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['groupId'],
      include: groupMessageInclude,
    });

    const lastMessageByGroupId = new Map(
      lastMessages.map((message) => [message.groupId, message]),
    );

    return memberships
      .map((membership) => {
        const lastMessage = lastMessageByGroupId.get(membership.groupId);

        if (!lastMessage) {
          return null;
        }

        return {
          group: membership.group,
          membersCount: membership.group._count.members,
          lastMessage,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort(
        (a, b) =>
          b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
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
