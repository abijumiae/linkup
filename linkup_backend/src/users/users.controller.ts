import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SafeUser, UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: { user: SafeUser }) {
    const user = await this.usersService.getProfile(req.user.id);
    return { user };
  }

  @Get('me/posts')
  getMyPosts(@Req() req: { user: SafeUser }) {
    return this.usersService.getMyPosts(req.user.id);
  }

  @Patch('me')
  async updateMe(@Req() req: { user: SafeUser }, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    return { user };
  }

  @Post(':userId/follow')
  toggleFollow(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.usersService.toggleFollow(req.user.id, userId);
  }
}
