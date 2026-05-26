import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { EventsModule } from './events/events.module';
import { GroupsModule } from './groups/groups.module';
import { JobsModule } from './jobs/jobs.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, PostsModule, NotificationsModule, MessagesModule, DiscoveryModule, GroupsModule, MarketplaceModule, JobsModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
