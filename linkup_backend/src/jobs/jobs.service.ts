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
import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const posterSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const applicantSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
} satisfies Prisma.UserSelect;

const jobInclude = {
  poster: { select: posterSelect },
  applications: {
    select: { applicantId: true },
  },
  _count: { select: { applications: true } },
} satisfies Prisma.JobInclude;

type JobRecord = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

export type JobResponse = Omit<JobRecord, 'applications' | '_count'> & {
  isOwner: boolean;
  hasApplied: boolean;
  applicationsCount: number;
};

export type JobsQuery = {
  q?: string;
  location?: string;
  jobType?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(posterId: string, dto: CreateJobDto): Promise<JobResponse> {
    const job = await this.prisma.job.create({
      data: {
        title: dto.title.trim(),
        company: dto.company.trim(),
        description: dto.description.trim(),
        location: dto.location.trim(),
        jobType: dto.jobType?.trim() || null,
        salary: dto.salary?.trim() || null,
        requirements: dto.requirements?.trim() || null,
        contactEmail: dto.contactEmail?.trim() || null,
        posterId,
        status: 'ACTIVE',
      },
      include: jobInclude,
    });

    return this.mapJob(job, posterId);
  }

  async findAll(
    userId: string,
    query: JobsQuery,
  ): Promise<PaginatedResult<JobResponse>> {
    const pagination = parsePaginationQuery(query);
    const where: Prisma.JobWhereInput = { status: 'ACTIVE' };

    if (query.location?.trim()) {
      where.location = { contains: query.location.trim(), mode: 'insensitive' };
    }

    if (query.jobType?.trim()) {
      where.jobType = { equals: query.jobType.trim(), mode: 'insensitive' };
    }

    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const jobs = await this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit + 1,
      include: jobInclude,
    });

    const mapped = jobs.map((job) => this.mapJob(job, userId));
    return buildPaginatedResult(mapped, pagination);
  }

  async findOne(id: string, userId: string): Promise<JobResponse> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: jobInclude,
    });

    if (!job || job.status !== 'ACTIVE') {
      throw new NotFoundException('Job not found');
    }

    return this.mapJob(job, userId);
  }

  async getMyPosts(posterId: string): Promise<JobResponse[]> {
    const jobs = await this.prisma.job.findMany({
      where: { posterId },
      orderBy: { createdAt: 'desc' },
      include: jobInclude,
    });

    return jobs.map((job) => this.mapJob(job, posterId));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateJobDto,
  ): Promise<JobResponse> {
    await this.getOwnedJob(id, userId);

    const job = await this.prisma.job.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        company: dto.company?.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        jobType:
          dto.jobType === undefined ? undefined : dto.jobType.trim() || null,
        salary:
          dto.salary === undefined ? undefined : dto.salary.trim() || null,
        requirements:
          dto.requirements === undefined
            ? undefined
            : dto.requirements.trim() || null,
        contactEmail:
          dto.contactEmail === undefined
            ? undefined
            : dto.contactEmail.trim() || null,
        status: dto.status?.trim(),
      },
      include: jobInclude,
    });

    return this.mapJob(job, userId);
  }

  async remove(id: string, userId: string) {
    await this.getOwnedJob(id, userId);

    await this.prisma.job.delete({ where: { id } });

    return { message: 'Job deleted successfully' };
  }

  async apply(jobId: string, applicantId: string, dto: ApplyJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.status !== 'ACTIVE') {
      throw new NotFoundException('Job not found');
    }

    if (job.posterId === applicantId) {
      throw new BadRequestException('You cannot apply to your own job');
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_applicantId: { jobId, applicantId },
      },
    });

    if (existing) {
      throw new ConflictException('You have already applied to this job');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        applicantId,
        coverLetter: dto.coverLetter?.trim() || null,
        resumeUrl: dto.resumeUrl?.trim() || null,
        status: 'PENDING',
      },
      include: {
        applicant: { select: applicantSelect },
      },
    });

    await this.notificationsService.notifyJobApplication(
      applicantId,
      jobId,
    );

    return application;
  }

  async getJobApplications(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.posterId !== userId) {
      throw new ForbiddenException(
        'Only the job poster can view applications',
      );
    }

    return this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        applicant: { select: applicantSelect },
      },
    });
  }

  async getMyApplications(applicantId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            poster: { select: posterSelect },
          },
        },
      },
    });
  }

  private async getOwnedJob(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.posterId !== userId) {
      throw new ForbiddenException('You can only modify your own jobs');
    }

    return job;
  }

  private mapJob(job: JobRecord, userId: string): JobResponse {
    const { applications, _count, ...rest } = job;

    return {
      ...rest,
      isOwner: job.posterId === userId,
      hasApplied: applications.some((app) => app.applicantId === userId),
      applicationsCount: _count.applications,
    };
  }
}
