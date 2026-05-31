import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { SafetyModule } from '../safety/safety.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ChatsController } from './chats.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    forwardRef(() => ChatModule),
    UploadsModule,
    SafetyModule,
    PrivacyModule,
  ],
  controllers: [MessagesController, ChatsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
