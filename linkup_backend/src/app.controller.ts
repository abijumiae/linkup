import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  root() {
    return {
      status: 'ok',
      service: 'linkup-backend',
      message: 'LinkUp backend is running',
    };
  }

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'linkup-backend',
        database: 'connected',
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
