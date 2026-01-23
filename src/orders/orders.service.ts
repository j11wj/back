import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZonesService } from '../zones/zones.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '../common/types/order-status.type';
import { UserRole } from '../common/types/user-role.type';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private zonesService: ZonesService,
  ) {}

  async create(createOrderDto: CreateOrderDto, customerId: string) {
    const { pickupLatitude, pickupLongitude, deliveryLatitude, deliveryLongitude, description } =
      createOrderDto;

    // Calculate distance, zone, and fare
    const { distance, zone, fare } =
      await this.zonesService.calculateZoneAndFare(
        pickupLatitude,
        pickupLongitude,
        deliveryLatitude,
        deliveryLongitude,
      );

    // Create order
    const order = await this.prisma.order.create({
      data: {
        customerId,
        zoneId: zone.id,
        pickupLatitude,
        pickupLongitude,
        deliveryLatitude,
        deliveryLongitude,
        distance,
        fare,
        description,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return order;
  }

  async findAll(userId: string, userRole: UserRole) {
    const where: any = {};

    if (userRole === 'CUSTOMER') {
      where.customerId = userId;
    } else if (userRole === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { userId },
      });
      if (driver) {
        where.driverId = driver.id;
      } else {
        return [];
      }
    }
    // Admin can see all orders

    return this.prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check access permissions
    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    if (userRole === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { userId },
      });
      if (driver && order.driverId !== driver.id) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    return order;
  }

  async acceptOrderByUserId(orderId: string, userId: string) {
    // Get driver ID from user
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new BadRequestException('Driver profile not found');
    }

    return this.acceptOrder(orderId, driver.id);
  }

  async acceptOrder(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Order is already ${order.status}. Only PENDING orders can be accepted.`,
      );
    }

    // Check if driver is available
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver || !driver.isAvailable) {
      throw new BadRequestException('Driver is not available');
    }

    // Update order
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        status: 'ACCEPTED',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return updatedOrder;
  }

  async updateStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: UserRole,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const { status } = updateOrderStatusDto;

    // Validate status transitions
    this.validateStatusTransition(order.status as OrderStatus, status, userRole);

    // Check permissions
    if (userRole === 'CUSTOMER') {
      if (order.customerId !== userId) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
      // Customers can only cancel pending orders
      if (status !== 'CANCELED' || order.status !== 'PENDING') {
        throw new ForbiddenException('You can only cancel pending orders');
      }
    } else if (userRole === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver || order.driverId !== driver.id) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return updatedOrder;
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    userRole: UserRole,
  ) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['ACCEPTED', 'CANCELED'],
      ACCEPTED: ['ON_THE_WAY', 'CANCELED'],
      ON_THE_WAY: ['DELIVERED', 'CANCELED'],
      DELIVERED: [],
      CANCELED: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async getAvailableOrders() {
    return this.prisma.order.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        zone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

