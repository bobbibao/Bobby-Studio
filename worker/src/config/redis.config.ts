import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEnvValueSet, isNumericEnv } from '@/shared/utils/env.utils';

@Injectable()
export class RedisConfig {
  constructor(private configService: ConfigService) {}

  private parseNumber(value: string | number | null | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseBoolean(value: string | boolean | null | undefined, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
  }

  get host(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get port(): number {
    const rawPort = this.configService.get<string>('REDIS_PORT', '6379');
    return this.parseNumber(rawPort, 6379);
  }

  get password(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  get db(): number {
    const rawDb = this.configService.get<string>('REDIS_DB', '0');
    return this.parseNumber(rawDb, 0);
  }

  get maxRetriesPerRequest(): number | null {
    const rawMaxRetries = this.configService.get<string>('REDIS_MAX_RETRIES');
    if (!isEnvValueSet(rawMaxRetries)) {
      return null;
    }
    const parsed = Number(rawMaxRetries);
    return Number.isFinite(parsed) ? parsed : null;
  }

  get connectTimeout(): number {
    const rawTimeout = this.configService.get<string>(
      'REDIS_CONNECT_TIMEOUT',
      '10000',
    );
    return this.parseNumber(rawTimeout, 10000);
  }

  get lazyConnect(): boolean {
    const rawLazyConnect = this.configService.get<string>('REDIS_LAZY_CONNECT', 'true');
    return this.parseBoolean(rawLazyConnect, true);
  }

  get enableReadyCheck(): boolean {
    const rawEnableReadyCheck = this.configService.get<string>(
      'REDIS_ENABLE_READY_CHECK',
      'true',
    );
    return this.parseBoolean(rawEnableReadyCheck, true);
  }

  get connectionConfig() {
    return {
      host: this.host,
      port: this.port,
      password: this.password,
      db: this.db,
      maxRetriesPerRequest: this.maxRetriesPerRequest,
      connectTimeout: this.connectTimeout,
      lazyConnect: this.lazyConnect,
      enableReadyCheck: this.enableReadyCheck,
    };
  }

  get isEnabled(): boolean {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<string>('REDIS_PORT');
    return isEnvValueSet(host) && isNumericEnv(port);
  }

  get bullConfig() {
    return {
      connection: this.connectionConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };
  }
}
