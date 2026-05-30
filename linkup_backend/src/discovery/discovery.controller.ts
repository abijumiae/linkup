import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { DiscoveryService } from './discovery.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  search(@Query('q') query: string, @Req() req: { user: SafeUser }) {
    return this.discoveryService.search(query ?? '', req.user.id);
  }

  @Get('explore')
  explore(@Req() req: { user: SafeUser }) {
    return this.discoveryService.getExplore(req.user.id);
  }

  @Get('discover')
  discover(@Req() req: { user: SafeUser }) {
    return this.discoveryService.getDiscover(req.user.id);
  }
}
