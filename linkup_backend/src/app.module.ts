import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { EventsModule } from './events/events.module';
import { GroupsModule } from './groups/groups.module';
import { JobsModule } from './jobs/jobs.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { MomentsModule } from './moments/moments.module';
import { WatchModule } from './watch/watch.module';
import { PrismaModule } from './prisma/prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { ConnectionsModule } from './connections/connections.module';
import { SafetyModule } from './safety/safety.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChatModule,
    PostsModule,
    MomentsModule,
    WatchModule,
    NotificationsModule,
    MessagesModule,
    DiscoveryModule,
    GroupsModule,
    MarketplaceModule,
    JobsModule,
    EventsModule,
    UploadsModule,
    ConnectionsModule,
    SafetyModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
