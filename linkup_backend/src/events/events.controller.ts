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
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Req() req: { user: SafeUser }, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.id, dto);
  }

  @Get('my/created')
  getMyCreated(@Req() req: { user: SafeUser }) {
    return this.eventsService.getMyCreated(req.user.id);
  }

  @Get('my/attending')
  getMyAttending(@Req() req: { user: SafeUser }) {
    return this.eventsService.getMyAttending(req.user.id);
  }

  @Get()
  findAll(
    @Req() req: { user: SafeUser },
    @Query('q') q?: string,
    @Query('location') location?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findAll(req.user.id, {
      q,
      location,
      category,
      page,
      limit,
    });
  }

  @Get(':id/attendees')
  getAttendees(@Param('id') id: string) {
    return this.eventsService.getAttendees(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.eventsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.eventsService.remove(id, req.user.id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.eventsService.join(id, req.user.id);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.eventsService.leave(id, req.user.id);
  }
}
