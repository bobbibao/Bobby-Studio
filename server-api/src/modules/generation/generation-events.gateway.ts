import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { GenerationUpdatedEvent } from '../../application/generation/contracts';
import { GenerationNotifier } from '../../application/generation/ports';
import { CurrentUser } from '../identity/principal';
import { PrincipalService } from '../identity/principal.service';

/** Room that receives every generation event of one user; joined automatically after authentication. */
export const userRoom = (userId: string) => `user:${userId}`;

interface AuthenticatedSocket extends Socket {
  data: { user?: CurrentUser };
}

@WebSocketGateway({
  cors: {
    origin: (process.env.ALLOWED_CORS_DOMAINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class GenerationEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, GenerationNotifier {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GenerationEventsGateway.name);

  constructor(
    private readonly principals: PrincipalService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(): void {
    this.logger.log('Generation events gateway initialized');
  }

  /**
   * The handshake must carry a valid Firebase ID token (auth.token). Unauthenticated sockets are
   * disconnected before they can join any room.
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.emit('authError', { message: 'Missing credentials' });
      client.disconnect(true);
      return;
    }
    try {
      client.data.user = await this.principals.authenticateToken(token);
    } catch {
      client.emit('authError', { message: 'Invalid or expired credentials' });
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(client.data.user.id));
    client.emit('authenticated', { userId: client.data.user.id });
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** A socket may join a job room only for its own job (kept for per-job subscriptions). */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, jobId: string): Promise<void> {
    const user = client.data.user;
    if (!user || typeof jobId !== 'string' || !(await this.ownsJob(jobId, user.id))) {
      client.emit('roomError', { jobId, message: 'Job not found' });
      return;
    }
    await client.join(jobId);
    client.emit('roomJoined', { jobId, message: 'Successfully joined job room' });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: AuthenticatedSocket, jobId: string): Promise<void> {
    if (typeof jobId !== 'string') return;
    await client.leave(jobId);
    client.emit('roomLeft', { jobId, message: 'Successfully left job room' });
  }

  jobUpdated(userId: string, event: GenerationUpdatedEvent): void {
    this.server?.to(userRoom(userId)).emit('generation.updated', event);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
    const header = client.handshake.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
    return match ? match[1].trim() : null;
  }

  private async ownsJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.prisma.imageJob.findUnique({ where: { id: jobId }, select: { userId: true } });
    return !!job && job.userId === userId;
  }
}
