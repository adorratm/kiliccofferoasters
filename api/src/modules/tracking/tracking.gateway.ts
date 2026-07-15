import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { Public } from '@common/decorators/public.decorator';

export type TrackUpdatePayload = {
  code: string;
  status: string;
  provider?: string;
  trackingUrl?: string | null;
  events?: Array<{ at: string; description: string; location?: string }>;
  order?: {
    id?: string;
    orderNumber: string;
    status: string;
    customerName: string;
  };
};

@Public()
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/tracking',
})
export class TrackingGateway {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly config: ConfigService) {
    const frontendUrl = this.config.get<string>('frontendUrl');
    this.logger.log(`Tracking gateway ready (frontend: ${frontendUrl})`);
  }

  @SubscribeMessage('track:subscribe')
  handleSubscribe(
    @MessageBody() data: { code?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const code = data?.code?.trim();
    if (!code) {
      return { ok: false, error: 'code required' };
    }
    const room = `tracking:${code}`;
    void client.join(room);
    this.logger.debug(`Client ${client.id} joined ${room}`);
    return { ok: true, room };
  }

  @SubscribeMessage('track:unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { code?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const code = data?.code?.trim();
    if (!code) return { ok: false };
    void client.leave(`tracking:${code}`);
    return { ok: true };
  }

  emitTrackUpdate(payload: TrackUpdatePayload) {
    if (!payload.code) return;
    const room = `tracking:${payload.code}`;
    this.server?.to(room).emit('track:update', payload);
    this.logger.debug(`Emitted track:update to ${room}`);
  }
}
