import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketplaceItemDto } from './dto/create-marketplace-item.dto';
import { UpdateMarketplaceItemDto } from './dto/update-marketplace-item.dto';

const sellerSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const itemInclude = {
  seller: { select: sellerSelect },
} satisfies Prisma.MarketplaceItemInclude;

type MarketplaceItemRecord = Prisma.MarketplaceItemGetPayload<{
  include: typeof itemInclude;
}>;

export type MarketplaceItemResponse = Omit<MarketplaceItemRecord, 'price'> & {
  price: number;
  isOwner: boolean;
};

export type MarketplaceQuery = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    sellerId: string,
    dto: CreateMarketplaceItemDto,
  ): Promise<MarketplaceItemResponse> {
    const item = await this.prisma.marketplaceItem.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        price: dto.price,
        currency: dto.currency?.trim().toUpperCase() || 'USD',
        category: dto.category.trim(),
        condition: dto.condition?.trim() || null,
        location: dto.location?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        sellerId,
        status: 'ACTIVE',
      },
      include: itemInclude,
    });

    return this.mapItem(item, sellerId);
  }

  async findAll(
    userId: string,
    query: MarketplaceQuery,
  ): Promise<MarketplaceItemResponse[]> {
    const where: Prisma.MarketplaceItemWhereInput = {
      status: 'ACTIVE',
    };

    if (query.category?.trim()) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    const items = await this.prisma.marketplaceItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: itemInclude,
    });

    return items.map((item) => this.mapItem(item, userId));
  }

  async findOne(id: string, userId: string): Promise<MarketplaceItemResponse> {
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { id },
      include: itemInclude,
    });

    if (!item || item.status !== 'ACTIVE') {
      throw new NotFoundException('Listing not found');
    }

    return this.mapItem(item, userId);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMarketplaceItemDto,
  ): Promise<MarketplaceItemResponse> {
    const item = await this.getOwnedItem(id, userId);

    const updated = await this.prisma.marketplaceItem.update({
      where: { id: item.id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        price: dto.price,
        currency: dto.currency?.trim().toUpperCase(),
        category: dto.category?.trim(),
        condition:
          dto.condition === undefined
            ? undefined
            : dto.condition.trim() || null,
        location:
          dto.location === undefined ? undefined : dto.location.trim() || null,
        imageUrl:
          dto.imageUrl === undefined ? undefined : dto.imageUrl.trim() || null,
        status: dto.status?.trim(),
      },
      include: itemInclude,
    });

    return this.mapItem(updated, userId);
  }

  async remove(id: string, userId: string) {
    await this.getOwnedItem(id, userId);

    await this.prisma.marketplaceItem.delete({
      where: { id },
    });

    return { message: 'Listing deleted successfully' };
  }

  private async getOwnedItem(id: string, userId: string) {
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Listing not found');
    }

    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only modify your own listings');
    }

    return item;
  }

  private mapItem(
    item: MarketplaceItemRecord,
    userId: string,
  ): MarketplaceItemResponse {
    return {
      ...item,
      price: Number(item.price),
      isOwner: item.sellerId === userId,
    };
  }
}
