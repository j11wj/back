import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { AuthService } from '../auth/auth.service';
import { DriverLocationService } from './services/driver-location.service';
import { OrderRealtimeService } from './services/order-realtime.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/types/user-role.type';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  email?: string;
}

interface DriverLocationUpdatePayload {
  lat: number;
  lng: number;
  orderId?: string;
}

interface DriverAcceptOrderPayload {
  orderId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private authService: AuthService,
    private driverLocationService: DriverLocationService,
    private orderRealtimeService: OrderRealtimeService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Initialize Socket.IO server with Redis adapter for horizontal scaling
   */
  afterInit(server: Server) {
    try {
      if (this.redisService.isAvailable()) {
        const pubClient = this.redisService.getPublisher();
        const subClient = this.redisService.getSubscriber();
        const adapter = createAdapter(pubClient, subClient);
        server.adapter(adapter);
        this.logger.log('Socket.IO server initialized with Redis adapter');
      } else {
        this.logger.warn('Redis not available. Socket.IO using in-memory adapter.');
      }
    } catch (error) {
      this.logger.warn(
        `Redis adapter failed: ${error.message}. Using in-memory adapter.`,
      );
    }

    if (this.orderRealtimeService) {
      this.orderRealtimeService.setRealtimeGateway(this);
      this.logger.log('RealtimeGateway set – restaurant/driver notifications enabled');
    }
  }

  /**
   * Handle new socket connection with JWT authentication
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided from ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        this.logger.warn(`Connection rejected: Invalid user ${payload.sub}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = user.id;
      client.userRole = user.role as UserRole;
      client.email = user.email;

      // Join user-specific room
      await client.join(`user:${user.id}`);

      // If driver, join driver room and set online status
      if (user.role === 'DRIVER') {
        await client.join('drivers');
        await this.driverLocationService.setDriverOnline(user.id);
        this.logger.log(`Driver ${user.id} connected and marked online`);
      }

      // If restaurant owner, join restaurant room for new order notifications
      if (user.role === 'RESTAURANT') {
        const restaurant = await this.prisma.restaurant.findFirst({
          where: { userId: user.id },
        });
        if (restaurant) {
          await client.join(`restaurant:${restaurant.id}`);
          this.logger.log(`Restaurant ${restaurant.id} (${restaurant.name}) connected for orders`);
        }
      }

      this.logger.log(
        `User connected: ${user.id} (${user.role}) - Socket: ${client.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Connection error for socket ${client.id}: ${error.message}`,
        error.stack,
      );
      client.disconnect();
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`User disconnected: ${client.userId} - Socket: ${client.id}`);

      // If driver, mark as offline and clear location
      if (client.userRole === 'DRIVER') {
        await this.driverLocationService.setDriverOffline(client.userId);
        this.logger.log(`Driver ${client.userId} disconnected and marked offline`);
      }
    } else {
      this.logger.warn(`Unauthenticated socket disconnected: ${client.id}`);
    }
  }

  /**
   * Handle driver location updates
   * Event: driver_location_update
   */
  @SubscribeMessage('driver_location_update')
  async handleDriverLocationUpdate(
    @MessageBody() payload: DriverLocationUpdatePayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Validate user is a driver
      if (client.userRole !== 'DRIVER') {
        throw new UnauthorizedException('Only drivers can send location updates');
      }

      if (!client.userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate payload
      this.validateLocationPayload(payload);

      // Update driver location in Redis
      await this.driverLocationService.updateDriverLocation(
        client.userId,
        payload.lat,
        payload.lng,
      );

      // If orderId is provided, broadcast to order room
      if (payload.orderId) {
        // Verify driver has access to this order
        const hasAccess = await this.orderRealtimeService.verifyDriverOrderAccess(
          payload.orderId,
          client.userId,
        );

        if (!hasAccess) {
          throw new BadRequestException('Driver does not have access to this order');
        }

        // Broadcast location to order room (customer will receive it)
        await this.orderRealtimeService.broadcastDriverLocation(
          payload.orderId,
          {
            lat: payload.lat,
            lng: payload.lng,
            driverId: client.userId,
            updatedAt: new Date().toISOString(),
          },
        );

        this.logger.debug(
          `Driver ${client.userId} location broadcasted for order ${payload.orderId}`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error handling driver location update from ${client.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle driver accepting an order
   * Event: driver_accept_order
   */
  @SubscribeMessage('driver_accept_order')
  async handleDriverAcceptOrder(
    @MessageBody() payload: DriverAcceptOrderPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Validate user is a driver
      if (client.userRole !== 'DRIVER') {
        throw new UnauthorizedException('Only drivers can accept orders');
      }

      if (!client.userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      if (!payload.orderId) {
        throw new BadRequestException('orderId is required');
      }

      // Accept order via service (this will update database and emit events)
      const order = await this.orderRealtimeService.acceptOrder(
        payload.orderId,
        client.userId,
      );

      // Join order room
      await client.join(`order:${payload.orderId}`);

      // Notify customer in order room
      this.server.to(`order:${payload.orderId}`).emit('order_status_update', {
        orderId: order.id,
        status: order.status,
        driver: order.driver,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Driver ${client.userId} accepted order ${payload.orderId}`,
      );

      return { success: true, order };
    } catch (error) {
      this.logger.error(
        `Error handling driver accept order from ${client.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle customer joining order room
   * Event: join_order_room
   */
  @SubscribeMessage('join_order_room')
  async handleJoinOrderRoom(
    @MessageBody() payload: { orderId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      if (!payload.orderId) {
        throw new BadRequestException('orderId is required');
      }

      // Verify user has access to this order
      const hasAccess = await this.orderRealtimeService.verifyUserOrderAccess(
        payload.orderId,
        client.userId,
        client.userRole,
      );

      if (!hasAccess) {
        throw new UnauthorizedException('You do not have access to this order');
      }

      // Join order room
      await client.join(`order:${payload.orderId}`);

      this.logger.log(
        `User ${client.userId} joined order room: ${payload.orderId}`,
      );

      return { success: true, orderId: payload.orderId };
    } catch (error) {
      this.logger.error(
        `Error joining order room: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle customer leaving order room
   * Event: leave_order_room
   */
  @SubscribeMessage('leave_order_room')
  async handleLeaveOrderRoom(
    @MessageBody() payload: { orderId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!payload.orderId) {
        throw new BadRequestException('orderId is required');
      }

      await client.leave(`order:${payload.orderId}`);

      this.logger.log(
        `User ${client.userId} left order room: ${payload.orderId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error leaving order room: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from auth object (Socket.IO v4+)
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

    if (!token) {
      return null;
    }

    // Remove 'Bearer ' prefix if present
    return token.startsWith('Bearer ') ? token.substring(7) : token;
  }

  /**
   * Verify JWT token and return payload
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Validate location payload
   */
  private validateLocationPayload(payload: DriverLocationUpdatePayload): void {
    if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
      throw new BadRequestException('lat and lng must be numbers');
    }

    if (payload.lat < -90 || payload.lat > 90) {
      throw new BadRequestException('lat must be between -90 and 90');
    }

    if (payload.lng < -180 || payload.lng > 180) {
      throw new BadRequestException('lng must be between -180 and 180');
    }
  }

  /**
   * Get server instance (for use in other services)
   */
  getServer(): Server {
    return this.server;
  }
}

