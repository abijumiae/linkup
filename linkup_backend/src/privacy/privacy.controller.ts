import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('me')
  getMyPrivacy(@Req() req: { user: SafeUser }) {
    return this.privacyService.getMyPrivacy(req.user.id);
  }

  @Patch('me')
  updateMyPrivacy(
    @Req() req: { user: SafeUser },
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.privacyService.updateMyPrivacy(req.user.id, dto);
  }
}
