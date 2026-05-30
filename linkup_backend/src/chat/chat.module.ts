import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './chat.gateway';
import { RealtimeEmitter } from './realtime.emitter';
import { WsAuthService } from './ws-auth.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => MessagesModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [ChatGateway, WsAuthService, RealtimeEmitter],
  exports: [ChatGateway, RealtimeEmitter],
})
export class ChatModule {}
