import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { isDatabaseConfigured } from 'src/shared/utils/env.utils';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  constructor() {
    super({
      log: [],
    });
  }
  async onModuleInit() {
    if (!isDatabaseConfigured()) {
      this.logger.warn(
        'DATABASE_URL is missing or placeholder. Skipping Prisma connection for local dev.',
      );
      return;
    }
    await this.$connect();
    // Custom query logging with timestamps
    (this as any).$on('query', (e: any) => {
      const timestamp = new Date().toISOString();
      this.logger.debug(`[${timestamp}] Query: ${e.query}`);
      this.logger.debug(`[${timestamp}] Duration: ${e.duration}ms`);
    });
    (this as any).$on('info', (e: any) => {
      const timestamp = new Date().toISOString();
      this.logger.log(`[${timestamp}] Info: ${e.message}`);
    });
    (this as any).$on('warn', (e: any) => {
      const timestamp = new Date().toISOString();
      this.logger.warn(`[${timestamp}] Warning: ${e.message}`);
    });
    (this as any).$on('error', (e: any) => {
      const timestamp = new Date().toISOString();
      this.logger.error(`[${timestamp}] Error: ${e.message}`);
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
