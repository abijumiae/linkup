import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

@Controller('work')
@UseGuards(JwtAuthGuard)
export class WorkController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.id, dto);
  }

  @Get('my/posts')
  getMyPosts(@Req() req: { user: SafeUser }) {
    return this.jobsService.getMyPosts(req.user.id);
  }

  @Get('my/applications')
  getMyApplications(@Req() req: { user: SafeUser }) {
    return this.jobsService.getMyApplications(req.user.id);
  }

  @Get()
  findAll(
    @Req() req: { user: SafeUser },
    @Query('q') q?: string,
    @Query('location') location?: string,
    @Query('jobType') jobType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.jobsService.findAll(req.user.id, {
      q,
      location,
      jobType,
      sort,
      page,
      limit,
    });
  }

  @Get(':id/applications')
  getApplications(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.jobsService.getJobApplications(id, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.jobsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.jobsService.remove(id, req.user.id);
  }

  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(id, req.user.id, dto);
  }
}
