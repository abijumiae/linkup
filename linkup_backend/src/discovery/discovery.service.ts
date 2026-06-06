import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeedPost } from '../posts/posts.service';
import { PrivacyService } from '../privacy/privacy.service';
import { SafetyService } from '../safety/safety.service';

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const userSearchSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

export type SearchUser = Prisma.UserGetPayload<{
  select: typeof userSearchSelect;
}> & {
  isFollowingAuthor: boolean;
};

export type SearchResults = {
  users: SearchUser[];
  posts: FeedPost[];
  hubs: DiscoverHub[];
  market: DiscoverMarketItem[];
  work: DiscoverWorkItem[];
  happenings: DiscoverHappening[];
  tags: string[];
};

const EXPLORE_LIMIT = 30;
const SEARCH_LIMIT = 5;
const DISCOVER_LIMIT = 5;

const discoverUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
  bio: true,
} satisfies Prisma.UserSelect;

export type DiscoverPerson = Prisma.UserGetPayload<{
  select: typeof discoverUserSelect;
}> & {
  isFollowingAuthor: boolean;
};

export type DiscoverHub = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  category: string;
  isMember: boolean;
};

export type DiscoverWatchItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  duration: number | null;
  creator: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
};

export type DiscoverMarketItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  location: string | null;
};

export type DiscoverWorkItem = {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: string | null;
};

export type DiscoverHappening = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  category: string | null;
  attendeesCount: number;
};

export type DiscoverResponse = {
  people: DiscoverPerson[];
  sparks: FeedPost[];
  hubs: DiscoverHub[];
  watch: DiscoverWatchItem[];
  market: DiscoverMarketItem[];
  work: DiscoverWorkItem[];
  happenings: DiscoverHappening[];
  tags: string[];
};

const DISCOVER_TAGS = [
  'Tech',
  'Business',
  'Design',
  'Learning',
  'Community',
  'Startup',
];

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: SafetyService,
    private readonly privacyService: PrivacyService,
  ) {}

  private emptyDiscoverResponse(): DiscoverResponse {
    return {
      people: [],
      sparks: [],
      hubs: [],
      watch: [],
      market: [],
      work: [],
      happenings: [],
      tags: DISCOVER_TAGS,
    };
  }

  private async safeSection<T>(
    label: string,
    loader: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await loader();
    } catch (error) {
      this.logger.warn(`Discover section "${label}" failed`, error);
      return fallback;
    }
  }

  async search(query: string, userId: string): Promise<SearchResults> {
    const q = query.trim();

    if (!q) {
      return {
        users: [],
        posts: [],
        hubs: [],
        market: [],
        work: [],
        happenings: [],
        tags: [],
      };
    }

    const tagMatches = DISCOVER_TAGS.filter((tag) =>
      tag.toLowerCase().includes(q.toLowerCase()),
    );

    const [users, posts, groupRows, marketRows, jobRows, eventRows] =
      await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
            { interests: { contains: q, mode: 'insensitive' } },
            { skills: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: userSearchSelect,
      }),
      this.prisma.post.findMany({
        where: {
          visibility: 'PUBLIC',
          groupId: null,
          content: { contains: q, mode: 'insensitive' },
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId }, select: { id: true } },
          savedBy: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.group.findMany({
        where: {
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { members: { _count: 'desc' } },
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.marketplaceItem.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          currency: true,
          category: true,
          location: true,
        },
      }),
      this.prisma.job.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          jobType: true,
        },
      }),
      this.prisma.event.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { startDate: 'asc' },
        include: { _count: { select: { attendees: true } } },
      }),
    ]);

    const following = await this.getFollowingSet(
      userId,
      users.map((user) => user.id),
    );

    const blockedIds = new Set(await this.safetyService.getBlockedUserIds(userId));

    const visibleUsers = (
      await Promise.all(
        users.map(async (user) => {
          if (blockedIds.has(user.id)) {
            return null;
          }
          const canView = await this.privacyService.canViewProfile(
            userId,
            user.id,
          );
          if (!canView) {
            return null;
          }
          return {
            ...user,
            isFollowingAuthor: following.has(user.id),
          };
        }),
      )
    ).filter((user): user is NonNullable<typeof user> => user !== null);

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const postFollowing = await this.getFollowingSet(userId, authorIds);

    const visiblePosts = posts.filter((post) => !blockedIds.has(post.authorId));

    return {
      users: visibleUsers,
      posts: visiblePosts.map((post) => this.mapPost(post, postFollowing)),
      hubs: groupRows.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        membersCount: group._count.members,
        category: 'Community',
        isMember: group.members.length > 0,
      })),
      market: marketRows.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        currency: item.currency,
        category: item.category,
        location: item.location,
      })),
      work: jobRows,
      happenings: eventRows.map((event) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        startDate: event.startDate.toISOString(),
        category: event.category,
        attendeesCount: event._count.attendees,
      })),
      tags: tagMatches,
    };
  }

  async getExplore(userId: string): Promise<FeedPost[]> {
    const posts = await this.prisma.post.findMany({
      where: { visibility: 'PUBLIC', groupId: null },
      take: EXPLORE_LIMIT,
      orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
        savedBy: { where: { userId }, select: { id: true } },
      },
    });

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const followingSet = await this.getFollowingSet(userId, authorIds);

    return posts.map((post) => this.mapPost(post, followingSet));
  }

  async getDiscover(userId: string): Promise<DiscoverResponse> {
    try {
      const [
        peopleRows,
        sparkRows,
        groupRows,
        watchRows,
        marketRows,
        jobRows,
        eventRows,
      ] = await Promise.all([
        this.safeSection('people', () => this.loadDiscoverPeople(userId), []),
        this.safeSection('sparks', () => this.loadDiscoverSparks(userId), []),
        this.safeSection('hubs', () => this.loadDiscoverHubs(userId), []),
        this.safeSection('watch', () => this.loadDiscoverWatch(), []),
        this.safeSection('market', () => this.loadDiscoverMarket(), []),
        this.safeSection('work', () => this.loadDiscoverWork(), []),
        this.safeSection('happenings', () => this.loadDiscoverHappenings(), []),
      ]);

      const peopleIds = peopleRows.map((user) => user.id);
      const sparkAuthorIds = [
        ...new Set(sparkRows.map((post) => post.authorId)),
      ];

      const [peopleFollowing, sparkFollowing] = await Promise.all([
        this.safeSection(
          'peopleFollowing',
          () => this.getFollowingSet(userId, peopleIds),
          new Set<string>(),
        ),
        this.safeSection(
          'sparkFollowing',
          () => this.getFollowingSet(userId, sparkAuthorIds),
          new Set<string>(),
        ),
      ]);

      return {
        people: peopleRows.map((user) => ({
          ...user,
          isFollowingAuthor: peopleFollowing.has(user.id),
        })),
        sparks: sparkRows.map((post) => this.mapPost(post, sparkFollowing)),
        hubs: groupRows,
        watch: watchRows,
        market: marketRows,
        work: jobRows,
        happenings: eventRows,
        tags: DISCOVER_TAGS,
      };
    } catch (error) {
      this.logger.warn('Discover aggregate failed', error);
      return this.emptyDiscoverResponse();
    }
  }

  private async loadDiscoverPeople(userId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: userId } },
      take: DISCOVER_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: discoverUserSelect,
    });
  }

  private async loadDiscoverSparks(userId: string) {
    return this.prisma.post.findMany({
      where: { visibility: 'PUBLIC', groupId: null },
      take: DISCOVER_LIMIT,
      orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
        savedBy: { where: { userId }, select: { id: true } },
      },
    });
  }

  private async loadDiscoverHubs(userId: string): Promise<DiscoverHub[]> {
    const groupRows = await this.prisma.group.findMany({
      where: { archivedAt: null },
      take: DISCOVER_LIMIT,
      orderBy: { members: { _count: 'desc' } },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return groupRows.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      membersCount: group._count.members,
      category: 'Community',
      isMember: group.members.length > 0,
    }));
  }

  private async loadDiscoverWatch(): Promise<DiscoverWatchItem[]> {
    const watchRows = await this.prisma.watchVideo.findMany({
      where: { isPublished: true },
      take: DISCOVER_LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return watchRows.map((video) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      category: video.category,
      duration: video.duration,
      creator: video.creator,
    }));
  }

  private async loadDiscoverMarket(): Promise<DiscoverMarketItem[]> {
    const marketRows = await this.prisma.marketplaceItem.findMany({
      where: { status: 'ACTIVE' },
      take: DISCOVER_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        currency: true,
        category: true,
        location: true,
      },
    });

    return marketRows.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: Number(item.price),
      currency: item.currency,
      category: item.category,
      location: item.location,
    }));
  }

  private async loadDiscoverWork(): Promise<DiscoverWorkItem[]> {
    return this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
      take: DISCOVER_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        jobType: true,
      },
    });
  }

  private async loadDiscoverHappenings(): Promise<DiscoverHappening[]> {
    const eventRows = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { gte: new Date() },
      },
      take: DISCOVER_LIMIT,
      orderBy: { startDate: 'asc' },
      include: {
        _count: { select: { attendees: true } },
      },
    });

    return eventRows.map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location,
      startDate: event.startDate.toISOString(),
      category: event.category,
      attendeesCount: event._count.attendees,
    }));
  }

  private async getFollowingSet(userId: string, targetIds: string[]) {
    if (targetIds.length === 0) {
      return new Set<string>();
    }

    const rows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetIds },
      },
      select: { followingId: true },
    });

    return new Set(rows.map((row) => row.followingId));
  }

  private mapPost(
    post: {
      id: string;
      authorId: string;
      groupId: string | null;
      content: string;
      postType: string;
      visibility: string;
      imageUrl: string | null;
      videoUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
      author: Prisma.UserGetPayload<{ select: typeof authorSelect }>;
      _count: { likes: number; comments: number };
      likes: { id: string }[];
      savedBy?: { id: string }[];
    },
    followingSet: Set<string>,
  ): FeedPost {
    return {
      id: post.id,
      authorId: post.authorId,
      groupId: post.groupId,
      content: post.content,
      postType: post.postType,
      visibility: post.visibility,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      liked: post.likes.length > 0,
      saved: (post.savedBy?.length ?? 0) > 0,
      isFollowingAuthor: followingSet.has(post.authorId),
    };
  }
}
