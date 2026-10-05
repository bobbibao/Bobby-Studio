import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';
import { RuntimeConfig } from '../../config/runtime-config';

/**
 * Socket.IO fan-out through Redis so a generation event produced on one API replica reaches sockets
 * connected to another. It is delivery only: REST snapshots remain the durable recovery path.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly clients: Redis[] = [];
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication, private readonly config: RuntimeConfig) {
    super(app);
  }

  connect(): void {
    const options = { host: this.config.redis.host, port: this.config.redis.port, password: this.config.redis.password, db: this.config.redis.db };
    const publisher = new Redis(options);
    const subscriber = publisher.duplicate();
    for (const client of [publisher, subscriber]) client.on('error', () => undefined);
    this.clients.push(publisher, subscriber);
    this.adapterConstructor = createAdapter(publisher, subscriber);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  async dispose(): Promise<void> {
    this.clients.forEach((client) => client.disconnect());
  }
}
