import { Module } from '@nestjs/common';
import { PrivacyModule } from '../privacy/privacy.module';
import { SafetyModule } from '../safety/safety.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [SafetyModule, PrivacyModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
