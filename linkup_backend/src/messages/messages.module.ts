import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatsController } from './chats.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [forwardRef(() => NotificationsModule), forwardRef(() => ChatModule)],
  controllers: [MessagesController, ChatsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
