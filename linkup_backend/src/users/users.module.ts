import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
