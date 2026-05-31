import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';

export type PrivacySettings = {
  profileVisibility: string;
  messagePermission: string;
  showOnlineStatus: boolean;
  showCountry: boolean;
  showActivity: boolean;
};

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPrivacy(userId: string): Promise<PrivacySettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        profileVisibility: true,
        messagePermission: true,
        showOnlineStatus: true,
        showCountry: true,
        showActivity: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMyPrivacy(
    userId: string,
    dto: UpdatePrivacyDto,
  ): Promise<PrivacySettings> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.profileVisibility !== undefined
          ? { profileVisibility: dto.profileVisibility }
          : {}),
        ...(dto.messagePermission !== undefined
          ? { messagePermission: dto.messagePermission }
          : {}),
        ...(dto.showOnlineStatus !== undefined
          ? { showOnlineStatus: dto.showOnlineStatus }
          : {}),
        ...(dto.showCountry !== undefined
          ? { showCountry: dto.showCountry }
          : {}),
        ...(dto.showActivity !== undefined
          ? { showActivity: dto.showActivity }
          : {}),
      },
      select: {
        profileVisibility: true,
        messagePermission: true,
        showOnlineStatus: true,
        showCountry: true,
        showActivity: true,
      },
    });

    return user;
  }

  async areConnected(userA: string, userB: string): Promise<boolean> {
    if (userA === userB) {
      return true;
    }

    const follow = await this.prisma.follow.findFirst({
      where: {
        OR: [
          { followerId: userA, followingId: userB },
          { followerId: userB, followingId: userA },
        ],
      },
      select: { id: true },
    });

    return Boolean(follow);
  }

  async canViewProfile(
    viewerId: string | null,
    profileUserId: string,
  ): Promise<boolean> {
    if (!viewerId || viewerId === profileUserId) {
      return true;
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: profileUserId },
      select: { profileVisibility: true },
    });

    if (!profile) {
      return false;
    }

    if (profile.profileVisibility === 'public') {
      return true;
    }

    if (profile.profileVisibility === 'private') {
      return false;
    }

    return this.areConnected(viewerId, profileUserId);
  }

  async assertCanMessage(senderId: string, receiverId: string): Promise<void> {
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { messagePermission: true },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    if (receiver.messagePermission === 'none') {
      throw new ForbiddenException("You can't message this user");
    }

    if (receiver.messagePermission === 'connections') {
      const connected = await this.areConnected(senderId, receiverId);
      if (!connected) {
        throw new ForbiddenException("You can't message this user");
      }
    }
  }
}
