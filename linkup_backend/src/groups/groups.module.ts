import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [NotificationsModule, MessagesModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
