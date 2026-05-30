import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { WorkController } from './work.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [JobsController, WorkController],
  providers: [JobsService],
})
export class JobsModule {}
