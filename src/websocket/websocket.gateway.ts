import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGatewayService } from './websocket-gateway.service';

/**
 * WebSocket Gateway for real-time relationship events.
 * 
 * Connection URL: ws://localhost:4200/ws?token=<JWT_TOKEN>
 * 
 * Authorization: Token must be passed in query parameter 'token'.
 * The token is validated and userId is extracted from the JWT payload (sub field).
 * 
 * Events sent to client:
 * - 'relationship_event': { type: 'friend_request_sent' | ..., data: { fromUserId, toUserId, timestamp } }
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*', // Adjust for production
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
})
export class RelationshipsWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RelationshipsWebSocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly gatewayService: WebSocketGatewayService,
  ) {}

  afterInit(server: Server) {
    this.gatewayService.setServer(server);
    this.logger.log('WebSocket Gateway initialized on namespace /ws');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query parameters
      const token = client.handshake.query.token as string;

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided (socket ${client.id})`);
        client.emit('error', { message: 'Token required' });
        client.disconnect();
        return;
      }

      // Validate JWT token
      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
      } catch (error) {
        this.logger.warn(`Connection rejected: invalid token (socket ${client.id})`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Extract userId from payload (JWT has 'sub' field with userId string)
      const userId = payload.sub || payload._id || payload.userId;
      if (!userId) {
        this.logger.warn(`Connection rejected: no userId in token payload (socket ${client.id})`);
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      // Store userId in socket data for later use
      (client as any).userId = userId;

      // Register connection
      this.gatewayService.addConnection(userId, client);

      this.logger.log(`User ${userId} connected (socket ${client.id})`);
      
      // Optional: send welcome message
      client.emit('connected', { message: 'Connected to WebSocket server', userId });
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`, error.stack);
      client.emit('error', { message: 'Connection error' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.gatewayService.removeConnection(userId, client);
      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    } else {
      this.logger.warn(`Socket ${client.id} disconnected without userId`);
    }
  }
}

