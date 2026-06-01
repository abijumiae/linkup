import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupLiveTalkService } from './group-live-talk.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    NotificationsModule,
    MessagesModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupLiveTalkService],
  exports: [GroupsService, GroupLiveTalkService],
})
export class GroupsModule {}
