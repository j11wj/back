import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../../orders/orders.service';
import { RealtimeGateway } from '../realtime.gateway';
import { UserRole } from '../../common/types/user-role.type';

interface DriverLocationBroadcast {
  lat: number;
  lng: number;
  driverId: string;
  updatedAt: string;
}

@Injectable()
export class OrderRealtimeService {
  private readonly logger = new Logger(OrderRealtimeService.name);
  private realtimeGateway: RealtimeGateway;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

  /**
   * Set the realtime gateway (called after initialization to break circular dependency)
   */
  setRealtimeGateway(gateway: RealtimeGateway) {
    this.realtimeGateway = gateway;
  }

  /**
   * Get the server instance
   */
  private getServer() {
    if (!this.realtimeGateway) {
      throw new Error('RealtimeGateway not initialized');
    }
    return this.realtimeGateway.getServer();
  }

  /**
   * Verify if a driver has access to an order
   */
  async verifyDriverOrderAccess(orderId: string, driverId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        driver: true,
      },
    });

    if (!order) {
      return false;
    }

    // Check if driver is assigned to this order
    if (order.driverId && order.driver) {
      return order.driver.userId === driverId;
    }

    return false;
  }

  /**
   * Verify if a user has access to an order
   */
  async verifyUserOrderAccess(
    orderId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        driver: true,
      },
    });

    if (!order) {
      return false;
    }

    // Admin has access to all orders
    if (userRole === 'ADMIN') {
      return true;
    }

    // Customer has access to their own orders
    if (userRole === 'CUSTOMER') {
      return order.customerId === userId;
    }

    // Driver has access to assigned orders
    if (userRole === 'DRIVER') {
      if (order.driverId && order.driver) {
        return order.driver.userId === userId;
      }
    }

    return false;
  }

  /**
   * Accept an order (called from socket handler)
   */
  async acceptOrder(orderId: string, driverUserId: string) {
    // Get driver ID from user ID
    const driver = await this.prisma.driver.findUnique({
      where: { userId: driverUserId },
    });

    if (!driver) {
      throw new BadRequestException('Driver profile not found');
    }

    // Accept order using orders service
    const order = await this.ordersService.acceptOrder(orderId, driver.id);

    // Emit order status update to order room
    this.emitOrderStatusUpdate(order.id, order.status, order);

    return order;
  }

  /**
   * Broadcast driver location to order room (customer only)
   */
  async broadcastDriverLocation(
    orderId: string,
    location: DriverLocationBroadcast,
  ): Promise<void> {
    const server = this.getServer();

    // Broadcast to order room
    server.to(`order:${orderId}`).emit('driver_location_broadcast', {
      orderId,
      location,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Broadcasted driver location for order ${orderId} to order room`,
    );
  }

  /**
   * Emit order status update to order room
   */
  async emitOrderStatusUpdate(
    orderId: string,
    status: string,
    order?: any,
  ): Promise<void> {
    const server = this.getServer();

    server.to(`order:${orderId}`).emit('order_status_update', {
      orderId,
      status,
      order,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted order status update for order ${orderId}: ${status}`);
  }

  /**
   * Notify customer when order is created (assign nearest driver)
   * This is called from the orders controller after order creation
   */
  async notifyOrderCreated(orderId: string, order: any): Promise<void> {
    let server: any;
    try {
      server = this.getServer();
    } catch {
      this.logger.warn('RealtimeGateway not ready, skip notify');
      return;
    }

    try {
      // Notify customer in their user room
      server.to(`user:${order.customerId}`).emit('order_created', {
        orderId,
        order,
        timestamp: new Date().toISOString(),
      });

      const poolId = order.poolZoneId ?? order.zoneId;
      const rest = order.restaurant;
      const newOrderPayload = {
        orderId,
        order: {
          id: order.id,
          pickupLatitude: order.pickupLatitude,
          pickupLongitude: order.pickupLongitude,
          deliveryLatitude: order.deliveryLatitude,
          deliveryLongitude: order.deliveryLongitude,
          distance: order.distance,
          fare: order.fare,
          description: order.description,
          poolZoneId: order.poolZoneId ?? null,
          zoneId: order.zoneId ?? null,
          restaurant: rest
            ? {
                id: rest.id,
                name: rest.name,
                latitude: rest.latitude ?? null,
                longitude: rest.longitude ?? null,
                zoneId: rest.zoneId ?? null,
              }
            : null,
        },
        timestamp: new Date().toISOString(),
      };

      if (poolId) {
        server.to(`zone:${poolId}:drivers`).emit('new_order_available', newOrderPayload);
        server.to(`zone:${poolId}:restaurants`).emit('restaurant_new_order', {
          orderId,
          order,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(
          `Notified zone ${poolId} (drivers + restaurants) for new order ${orderId}`,
        );
      } else {
        this.logger.warn(`Order ${orderId} has no pool/zone id; skipping zone broadcast`);
      }

      this.logger.log(`Notified about new order ${orderId}`);
    } catch (err) {
      this.logger.warn(`notifyOrderCreated failed: ${err?.message || err}`);
    }
  }

  /**
   * Close order room when order is delivered or canceled
   */
  async closeOrderRoom(orderId: string): Promise<void> {
    const server = this.getServer();

    // Notify all clients in the room that order is closed
    server.to(`order:${orderId}`).emit('order_room_closed', {
      orderId,
      timestamp: new Date().toISOString(),
    });

    // Disconnect all clients from the room
    const sockets = await server.in(`order:${orderId}`).fetchSockets();
    for (const socket of sockets) {
      socket.leave(`order:${orderId}`);
    }

    this.logger.log(`Closed order room for order ${orderId}`);
  }

  /**
   * Get order room name
   */
  getOrderRoomName(orderId: string): string {
    return `order:${orderId}`;
  }
}

