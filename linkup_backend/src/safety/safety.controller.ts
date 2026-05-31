import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateReportDto } from './dto/create-report.dto';
import { SafetyService } from './safety.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('reports')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createReport(
    @Req() req: { user: SafeUser },
    @Body() dto: CreateReportDto,
  ) {
    return this.safetyService.createReport(req.user.id, dto);
  }

  @Post('blocks/:userId')
  blockUser(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.safetyService.blockUser(req.user.id, userId);
  }

  @Delete('blocks/:userId')
  unblockUser(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.safetyService.unblockUser(req.user.id, userId);
  }

  @Get('blocks')
  listBlocks(@Req() req: { user: SafeUser }) {
    return this.safetyService.listBlocks(req.user.id);
  }

  @Get('blocks/me')
  listMyBlocks(@Req() req: { user: SafeUser }) {
    return this.safetyService.listBlocks(req.user.id);
  }

  @Get('blocks/:userId/status')
  getBlockStatus(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.safetyService.getBlockStatus(req.user.id, userId);
  }
}
