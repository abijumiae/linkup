import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

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
    const timeoutMs = 5_000;

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Database health check timed out')), timeoutMs);
        }),
      ]);

      return {
        status: 'ok',
        service: 'linkup-backend',
        database: 'connected',
        realtime: 'socket.io',
        socketPath: '/socket.io',
        features: {
          liveTalk: true,
          hubAdmins: true,
        },
        time: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'linkup-backend',
        database: 'disconnected',
        time: new Date().toISOString(),
      });
    }
  }
}
