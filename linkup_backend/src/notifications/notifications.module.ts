import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SafetyModule } from '../safety/safety.module';
import { AlertsController } from './alerts.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [forwardRef(() => ChatModule), forwardRef(() => SafetyModule)],
  controllers: [NotificationsController, AlertsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
