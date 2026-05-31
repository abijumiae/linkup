import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { AdminController } from './admin.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [forwardRef(() => ChatModule)],
  controllers: [AdminController],
  providers: [ModerationService],
})
export class AdminModule {}
