import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { ConnectionsService } from './connections.service';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get('me')
  getMyConnections(@Req() req: { user: SafeUser }) {
    return this.connectionsService.getMyConnections(req.user.id);
  }

  @Get('suggestions')
  getSuggestions(@Req() req: { user: SafeUser }) {
    return this.connectionsService.getSuggestions(req.user.id);
  }

  @Post(':userId')
  connect(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.connectionsService.connect(req.user.id, userId);
  }

  @Delete(':userId')
  disconnect(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.connectionsService.disconnect(req.user.id, userId);
  }
}
