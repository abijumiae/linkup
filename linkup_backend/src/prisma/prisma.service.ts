import 'dotenv/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    if (!parsed.searchParams.has('uselibpqcompat')) {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool({
      connectionString: normalizeDatabaseUrl(connectionString),
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      max: 10,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    this.pool.on('error', (error) => {
      this.logger.error(`PostgreSQL pool error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        this.logger.log('Database connected');
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxAttempts} failed: ${message}`,
        );

        if (attempt === maxAttempts) {
          this.logger.error(
            'Database unavailable after retries — API will start in degraded mode',
          );
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
      }
    }
  }

  async ensureConnection(): Promise<boolean> {
    try {
      await Promise.race([
        this.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Database health check timed out')),
            8_000,
          );
        }),
      ]);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Database ping failed (${message}), reconnecting...`);

      try {
        await this.$disconnect();
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        this.logger.log('Database reconnected');
        return true;
      } catch (reconnectError) {
        const reconnectMessage =
          reconnectError instanceof Error
            ? reconnectError.message
            : String(reconnectError);
        this.logger.error(`Database reconnect failed: ${reconnectMessage}`);
        return false;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
