import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  buildPaginatedResult,
  PaginatedResult,
  parsePaginationQuery,
} from '../common/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const organizerSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const attendeeUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const eventInclude = {
  organizer: { select: organizerSelect },
  attendees: {
    select: { userId: true, status: true },
  },
  _count: { select: { attendees: true } },
} satisfies Prisma.EventInclude;

type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

export type EventResponse = Omit<EventRecord, 'attendees' | '_count'> & {
  isOrganizer: boolean;
  isGoing: boolean;
  attendeesCount: number;
};

export type EventsQuery = {
  q?: string;
  location?: string;
  category?: string;
  timeframe?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(organizerId: string, dto: CreateEventDto): Promise<EventResponse> {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        location: dto.location.trim(),
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        imageUrl: dto.imageUrl?.trim() || null,
        category: dto.category?.trim() || null,
        organizerId,
        status: 'ACTIVE',
      },
      include: eventInclude,
    });

    return this.mapEvent(event, organizerId);
  }

  async findAll(
    userId: string,
    query: EventsQuery,
  ): Promise<PaginatedResult<EventResponse>> {
    const pagination = parsePaginationQuery(query);
    const now = new Date();
    const filters: Prisma.EventWhereInput[] = [{ status: 'ACTIVE' }];

    switch (query.timeframe) {
      case 'live':
        filters.push({
          startDate: { lte: now },
          OR: [{ endDate: { gte: now } }, { endDate: null }],
        });
        break;
      case 'upcoming':
        filters.push({ startDate: { gt: now } });
        break;
      case 'past':
        filters.push({
          OR: [
            { endDate: { lt: now } },
            { endDate: null, startDate: { lt: now } },
          ],
        });
        break;
      case 'all':
        break;
      default:
        filters.push({
          OR: [
            { startDate: { gte: now } },
            { endDate: { gte: now } },
          ],
        });
        break;
    }

    if (query.location?.trim()) {
      filters.push({
        location: {
          contains: query.location.trim(),
          mode: 'insensitive',
        },
      });
    }

    if (query.category?.trim()) {
      filters.push({
        category: {
          equals: query.category.trim(),
          mode: 'insensitive',
        },
      });
    }

    if (query.q?.trim()) {
      const term = query.q.trim();
      filters.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const events = await this.prisma.event.findMany({
      where: { AND: filters },
      orderBy:
        query.timeframe === 'past'
          ? { startDate: 'desc' }
          : { startDate: 'asc' },
      skip: pagination.skip,
      take: pagination.limit + 1,
      include: eventInclude,
    });

    const mapped = events.map((event) => this.mapEvent(event, userId));
    return buildPaginatedResult(mapped, pagination);
  }

  async findOne(id: string, userId: string): Promise<EventResponse> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });

    if (!event || event.status !== 'ACTIVE') {
      throw new NotFoundException('Event not found');
    }

    return this.mapEvent(event, userId);
  }

  async getMyCreated(organizerId: string): Promise<EventResponse[]> {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { startDate: 'asc' },
      include: eventInclude,
    });

    return events.map((event) => this.mapEvent(event, organizerId));
  }

  async getMyAttending(userId: string): Promise<EventResponse[]> {
    const attendances = await this.prisma.eventAttendee.findMany({
      where: { userId },
      include: {
        event: { include: eventInclude },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attendances.map((row) => this.mapEvent(row.event, userId));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateEventDto,
  ): Promise<EventResponse> {
    await this.getOwnedEvent(id, userId);

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        startDate: dto.startDate,
        endDate: dto.endDate === undefined ? undefined : dto.endDate,
        imageUrl:
          dto.imageUrl === undefined ? undefined : dto.imageUrl.trim() || null,
        category:
          dto.category === undefined ? undefined : dto.category.trim() || null,
        status: dto.status?.trim(),
      },
      include: eventInclude,
    });

    return this.mapEvent(event, userId);
  }

  async remove(id: string, userId: string) {
    await this.getOwnedEvent(id, userId);

    await this.prisma.event.delete({ where: { id } });

    return { message: 'Event deleted successfully' };
  }

  async join(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event || event.status !== 'ACTIVE') {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId === userId) {
      throw new BadRequestException(
        'Organizers do not need to join their own event',
      );
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (existing) {
      throw new ConflictException('You are already going to this event');
    }

    await this.prisma.eventAttendee.create({
      data: {
        eventId,
        userId,
        status: 'GOING',
      },
    });

    await this.notificationsService.notifyEventJoin(userId, eventId);

    return this.findOne(eventId, userId);
  }

  async leave(eventId: string, userId: string) {
    const attendance = await this.prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!attendance) {
      throw new BadRequestException('You are not attending this event');
    }

    await this.prisma.eventAttendee.delete({
      where: { id: attendance.id },
    });

    return this.findOne(eventId, userId);
  }

  async getAttendees(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.eventAttendee.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: attendeeUserSelect },
      },
    });
  }

  private async getOwnedEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new ForbiddenException('You can only modify your own events');
    }

    return event;
  }

  private mapEvent(event: EventRecord, userId: string): EventResponse {
    const { attendees, _count, ...rest } = event;

    return {
      ...rest,
      isOrganizer: event.organizerId === userId,
      isGoing: attendees.some((row) => row.userId === userId),
      attendeesCount: _count.attendees,
    };
  }
}
