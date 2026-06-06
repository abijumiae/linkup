import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RealtimeEmitter } from './chat/realtime.emitter';
import { EmailService } from './email/email.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitter,
    private readonly emailService: EmailService,
  ) {}

  @SkipThrottle()
  @Get()
  root() {
    return {
      status: 'ok',
      service: 'linkup-backend',
      message: 'LinkUp backend is running',
    };
  }

  @SkipThrottle()
  @Get('health')
  async health() {
    return this.buildHealthResponse();
  }

  @SkipThrottle()
  @Get('api/health')
  async apiHealth() {
    return this.buildHealthResponse();
  }

  private async buildHealthResponse() {
    const databaseConnected = await this.prisma.ensureConnection();

    if (!databaseConnected) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'linkup-backend',
        database: 'disconnected',
        time: new Date().toISOString(),
      });
    }

    const smtp = this.emailService.getStatus();

    return {
      status: 'ok',
      service: 'linkup-backend',
      database: 'connected',
      email: {
        configured: smtp.configured,
        ready: smtp.ready,
        host: smtp.host,
        from: smtp.from,
        appUrl: smtp.appUrl,
        lastError: smtp.lastError,
      },
      realtime: this.realtimeEmitter.isReady() ? 'socket.io' : 'starting',
      socketPath: '/socket.io',
      socketPingIntervalMs: 25_000,
      features: {
        liveTalk: true,
        hubAdmins: true,
        emailVerification: smtp.configured,
      },
      time: new Date().toISOString(),
    };
  }
}
