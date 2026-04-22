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
import { HistoryJobDto } from '../attribute/dto/user-attribute.dto';

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
    origin: (process.env.ALLOWED_CORS_DOMAINS || '').split(','),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class JobStatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('JobStatusGateway');

  afterInit(server: Server) {
    this.logger.log('Socket.io gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, jobId: string) {
    client.join(jobId);
    // this.logger.log(`Client ${client.id} joined room: ${jobId}`);
    client.emit('roomJoined', {
      jobId,
      message: 'Successfully joined job room',
    });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, jobId: string) {
    client.leave(jobId);
    this.logger.log(`Client ${client.id} left room: ${jobId}`);
    client.emit('roomLeft', { jobId, message: 'Successfully left job room' });
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

  // Emit specific job events
  joinJobRoom(client: any, jobId: string) {
    client.join(jobId);
  }
}
