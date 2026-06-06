import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GroupsModule } from '../groups/groups.module';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';
import { RealtimeEmitter } from './realtime.emitter';
import { WsAuthService } from './ws-auth.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => GroupsModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [ChatGateway, WsAuthService, RealtimeEmitter, PresenceService],
  exports: [ChatGateway, RealtimeEmitter, PresenceService],
})
export class ChatModule {}
