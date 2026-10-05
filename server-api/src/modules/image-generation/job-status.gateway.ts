import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HistoryJobDto } from '../attribute/dto/user-attribute.dto';
import { CurrentUser } from '../identity/principal';
import { PrincipalService } from '../identity/principal.service';

/** Room that receives every event for one user; joined automatically after authentication. */
export const userRoom = (userId: string) => `user:${userId}`;

interface AuthenticatedSocket extends Socket {
  data: { user?: CurrentUser };
}

// Type for frontend GenerateImageResponse structure
interface GenerateImageResponse {
  userId: string;
  attributeId: string;
  version: string;
  jobId?: string;
  imagePath?: string;
  generatedImage: {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
    thumbnail?: string;
    dimensions?: string;
    creationType?: string;
    inputType?: string;
    selectedStyle?: string;
    prompt?: string;
  };
  method?: string;
  // Model tracking fields
  model?: string; // Model endpoint used for generation
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
export class JobStatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('JobStatusGateway');

  constructor(
    private readonly principals: PrincipalService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.io gateway initialized');
  }

  /**
   * The handshake must carry a valid Firebase ID token (auth.token). Unauthenticated sockets are
   * disconnected before they can join any room.
   */
  async handleConnection(client: AuthenticatedSocket) {
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

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** A socket may join a job room only when the job belongs to its authenticated user. */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, jobId: string) {
    const user = client.data.user;
    if (!user || typeof jobId !== 'string' || !(await this.ownsJob(jobId, user.id))) {
      client.emit('roomError', { jobId, message: 'Job not found' });
      return;
    }
    await client.join(jobId);
    client.emit('roomJoined', { jobId, message: 'Successfully joined job room' });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: AuthenticatedSocket, jobId: string) {
    if (typeof jobId !== 'string') return;
    await client.leave(jobId);
    client.emit('roomLeft', { jobId, message: 'Successfully left job room' });
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
    const header = client.handshake.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
    return match ? match[1].trim() : null;
  }

  private async ownsJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.prisma.imageJob.findUnique({
      where: { id: jobId },
      select: { userId: true, request: { select: { userId: true } } },
    });
    return !!job && (job.userId ?? job.request?.userId) === userId;
  }

  emitJobStatus(
    jobId: string,
    status: string,
    progress: number,
    data?: HistoryJobDto | GenerateImageResponse,
    error?: string,
  ) {
    const payload: any = { jobId, status, progress, data };

    // Include error message if status is failed
    if (status === 'failed' && error) {
      payload.error = error;
    }

    this.server.to(jobId).emit('jobStatus', payload);
    this.logger.log(
      `Emitted job status: ${status} for jobId: ${jobId} to room ${jobId}${error ? ` with error: ${error}` : ''}`,
    );
  }

}
