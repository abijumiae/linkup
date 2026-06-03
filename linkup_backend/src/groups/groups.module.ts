import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupHubAdminsService } from './group-hub-admins.service';
import { GroupHubPermissionsService } from './group-hub-permissions.service';
import { GroupLiveTalkController } from './group-live-talk.controller';
import { GroupLiveTalkManager } from './group-live-talk.manager';
import { GroupLiveTalkService } from './group-live-talk.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    NotificationsModule,
    MessagesModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [GroupsController, GroupLiveTalkController],
  providers: [
    GroupsService,
    GroupLiveTalkService,
    GroupLiveTalkManager,
    GroupHubPermissionsService,
    GroupHubAdminsService,
  ],
  exports: [
    GroupsService,
    GroupLiveTalkService,
    GroupLiveTalkManager,
    GroupHubPermissionsService,
  ],
})
export class GroupsModule {}
