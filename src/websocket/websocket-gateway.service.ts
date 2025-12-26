import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';

/**
 * Service for managing WebSocket connections and sending real-time events to users.
 * Maps userId -> Socket connections (one user can have multiple connections if multiple tabs are open).
 */
@Injectable()
export class WebSocketGatewayService {
  private readonly logger = new Logger(WebSocketGatewayService.name);
  private server: Server | null = null;
  // Map: userId (string) -> Set of Socket instances (multiple tabs/devices per user)
  private userConnections = new Map<string, Set<Socket>>();

  /**
   * Set the Socket.IO server instance (called from Gateway after initialization)
   */
  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server initialized');
  }

  /**
   * Register a new connection for a user
   */
  addConnection(userId: string, socket: Socket) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socket);
    this.logger.log(`User ${userId} connected (total connections: ${this.userConnections.get(userId)!.size})`);
  }

  /**
   * Remove a connection for a user
   */
  removeConnection(userId: string, socket: Socket) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(socket);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
      this.logger.log(`User ${userId} disconnected (remaining: ${connections.size})`);
    }
  }

  /**
   * Send an event to a specific user (all their connections will receive it)
   * Returns true if at least one connection received the message, false otherwise
   */
  sendToUser(
    userId: string | Types.ObjectId,
    event: {
      type: 'friend_request_sent' | 'friend_request_accepted' | 'friend_request_declined' | 'friend_removed';
      data: {
        fromUserId: string;
        toUserId: string;
        timestamp?: string;
      };
    },
  ): boolean {
    const userIdStr = userId instanceof Types.ObjectId ? userId.toString() : userId;
    const connections = this.userConnections.get(userIdStr);

    if (!connections || connections.size === 0) {
      this.logger.debug(`No active connections for user ${userIdStr}`);
      return false;
    }

    let sent = 0;
    connections.forEach((socket) => {
      if (socket.connected) {
        socket.emit('relationship_event', event);
        sent++;
      }
    });

    this.logger.log(`Sent event ${event.type} to user ${userIdStr} (${sent}/${connections.size} connections)`);
    return sent > 0;
  }

  /**
   * Get count of active connections for a user (for debugging)
   */
  getConnectionCount(userId: string | Types.ObjectId): number {
    const userIdStr = userId instanceof Types.ObjectId ? userId.toString() : userId;
    return this.userConnections.get(userIdStr)?.size || 0;
  }

  /**
   * Get total number of connected users
   */
  getTotalConnectedUsers(): number {
    return this.userConnections.size;
  }
}

