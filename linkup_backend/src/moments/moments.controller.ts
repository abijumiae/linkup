import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { MomentsService } from './moments.service';

@Controller('moments')
@UseGuards(JwtAuthGuard)
export class MomentsController {
  private readonly logger = new Logger(MomentsController.name);

  constructor(private readonly momentsService: MomentsService) {}

  @Post()
  @HttpCode(201)
  create(@Req() req: { user: SafeUser }, @Body() dto: CreateMomentDto) {
    this.logger.log(`Creating moment for user ${req.user.id}`);
    return this.momentsService.create(req.user.id, dto);
  }

  @Get()
  getFeed(@Req() req: { user: SafeUser }) {
    return this.momentsService.findActiveFeed(req.user.id);
  }

  @Get('me')
  getMine(@Req() req: { user: SafeUser }) {
    return this.momentsService.findActiveByUser(req.user.id);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.momentsService.findActiveByUser(userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.momentsService.delete(id, req.user.id);
  }
}
