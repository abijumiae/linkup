import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupPostDto } from './dto/create-group-post.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: { user: SafeUser }) {
    return this.groupsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.groupsService.findOne(id, req.user.id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.groupsService.join(id, req.user.id);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.groupsService.leave(id, req.user.id);
  }

  @Get(':id/posts')
  getPosts(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.groupsService.getGroupPosts(id, req.user.id);
  }

  @Post(':id/posts')
  createPost(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: CreateGroupPostDto,
  ) {
    return this.groupsService.createGroupPost(id, req.user.id, dto);
  }
}
