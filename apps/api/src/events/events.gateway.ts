import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Client joins a tenant-specific room ────────────────
  @SubscribeMessage('joinTenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    client.join(`tenant:${data.tenantId}`);
    this.logger.log(`Client ${client.id} joined tenant:${data.tenantId}`);
    client.emit('joinedTenant', { tenantId: data.tenantId });
  }

  // ─── Client leaves a tenant room ───────────────────────
  @SubscribeMessage('leaveTenant')
  handleLeaveTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    client.leave(`tenant:${data.tenantId}`);
    this.logger.log(`Client ${client.id} left tenant:${data.tenantId}`);
  }

  // ─── Broadcast: Order Updated ──────────────────────────
  broadcastOrderUpdate(
    tenantId: string,
    payload: { action: string; orderId: string; data?: unknown },
  ): void {
    this.server.to(`tenant:${tenantId}`).emit('order:updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Broadcast: Inventory Updated ─────────────────────
  broadcastInventoryUpdate(
    tenantId: string,
    payload: { action: string; itemId: string; data?: unknown },
  ): void {
    this.server.to(`tenant:${tenantId}`).emit('inventory:updated', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Broadcast: Generic Event ─────────────────────────
  broadcastEvent(tenantId: string, event: string, payload: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      ...(payload as object),
      timestamp: new Date().toISOString(),
    });
  }
}
