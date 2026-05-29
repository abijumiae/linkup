import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => ChatModule)],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
