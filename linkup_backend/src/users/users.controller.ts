import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CompleteOnboardingDto } from '../auth/dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SafeUser, UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('online')
  async getOnlineUsers() {
    const userIds = await this.usersService.getOnlineUserIds();
    return { userIds };
  }

  @Get('online-status')
  async getOnlineStatus() {
    const snapshot = await this.usersService.getOnlineStatus();
    return {
      onlineUserIds: snapshot.onlineUserIds,
      users: snapshot.users,
    };
  }

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

  @Patch('me/onboarding')
  async completeOnboarding(
    @Req() req: { user: SafeUser },
    @Body() dto: CompleteOnboardingDto,
  ) {
    console.log('Onboarding request received for user:', req.user.id);

    const user = await this.usersService.completeOnboarding(req.user.id, {
      username: dto.username.trim(),
      accountType: dto.accountType,
      country: dto.country.trim(),
      language: dto.language.trim(),
    });

    return { user: this.usersService.sanitize(user) };
  }

  @Post(':userId/follow')
  toggleFollow(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.usersService.toggleFollow(req.user.id, userId);
  }
}
