import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './chat.gateway';
import { WsAuthService } from './ws-auth.service';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => MessagesModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [ChatGateway, WsAuthService],
  exports: [ChatGateway],
})
export class ChatModule {}
