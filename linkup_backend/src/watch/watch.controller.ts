import {
  Body,
  Controller,
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
import { CreateWatchVideoDto } from './dto/create-watch-video.dto';
import { UpdateWatchProgressDto } from './dto/update-watch-progress.dto';
import { WatchService } from './watch.service';

@Controller('watch')
@UseGuards(JwtAuthGuard)
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  @Get('progress/me')
  getMyProgress(@Req() req: { user: SafeUser }) {
    return this.watchService.getMyProgress(req.user.id);
  }

  @Get()
  findAll(
    @Req() req: { user: SafeUser },
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.watchService.findAll({
      category,
      type,
      search,
      userId: req.user.id,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.watchService.findOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreateWatchVideoDto) {
    return this.watchService.create(req.user.id, dto);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateWatchProgressDto,
  ) {
    return this.watchService.updateProgress(id, req.user.id, dto);
  }
}
