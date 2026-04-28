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
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType, TransactionCategory } from '../transactions/dto/create-transaction.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private zonesService: ZonesService,
    private transactionsService: TransactionsService,
    private authService: AuthService,
  ) {}

  /** منطقة العرض المشتركة (قديم بدون poolZoneId يُعادل zoneId) */
  private effectivePoolZoneId(order: {
    poolZoneId: string | null;
    zoneId: string | null;
  }): string | null {
    return order.poolZoneId ?? order.zoneId ?? null;
  }

  async create(createOrderDto: CreateOrderDto) {
    const resolvedDeviceToken = (
      createOrderDto.deviceToken ??
      createOrderDto.fcmToken ??
      ''
    ).trim();
    if (resolvedDeviceToken.length < 10) {
      throw new BadRequestException('توكن الجهاز (FCM) مطلوب');
    }

    const { id: customerId } = await this.authService.ensureCustomerForOrder(
      createOrderDto.customerPhone,
      createOrderDto.customerName,
      resolvedDeviceToken,
    );
    const { pickupLatitude, pickupLongitude, deliveryLatitude, deliveryLongitude, restaurantId, description, items, couponCode } =
      createOrderDto;

    let restaurant = null;
    let subtotal = 0;
    let discount = 0;
    let commission = 0;

    // If restaurantId is provided, verify restaurant exists and calculate subtotal
    if (restaurantId) {
      restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });

      if (!restaurant) {
        throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
      }

      if (!restaurant.isActive) {
        throw new BadRequestException('Restaurant is not active');
      }

      if (!restaurant.isOpen) {
        throw new BadRequestException('Restaurant is currently closed');
      }

      // Calculate subtotal from order items
      if (items && items.length > 0) {
        for (const item of items) {
          const menuItem = await this.prisma.menuItem.findUnique({
            where: { id: item.menuItemId },
          });

          if (!menuItem) {
            throw new NotFoundException(`Menu item with ID ${item.menuItemId} not found`);
          }

          if (!menuItem.isAvailable) {
            throw new BadRequestException(`Menu item ${menuItem.name} is not available`);
          }

          const extras = item.extrasPrice ?? 0;
          subtotal += menuItem.price * item.quantity + extras;
        }

        // Calculate commission from restaurant commission rate
        commission = (subtotal * restaurant.commissionRate) / 100;
      }
    }

    // Apply coupon discount if provided
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      // Check if coupon is valid
      const now = new Date();
      const isValid = coupon && 
        coupon.isActive &&
        now >= coupon.validFrom &&
        now <= coupon.validUntil &&
        (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit);

      if (isValid) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discountValue;
        }

        // Check minimum order amount
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          throw new BadRequestException(`Minimum order amount of ${coupon.minOrderAmount} required for this coupon`);
        }
      }
    }

    // Calculate distance, zone, and fare
    const { distance, zone, fare } =
      await this.zonesService.calculateZoneAndFare(
        pickupLatitude,
        pickupLongitude,
        deliveryLatitude,
        deliveryLongitude,
      );

    const tax = subtotal * 0.1; // 10% tax (can be made configurable)
    const total = subtotal + tax - discount + (fare || 0);

    /** منطقة مشاركة الطلب (سائقون ومطاعم في نفس المنطقة يرونه) */
    const poolZoneId = restaurant?.zoneId ?? zone.id;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        customerId,
        restaurantId,
        zoneId: zone.id,
        poolZoneId,
        couponId: couponCode ? (await this.prisma.coupon.findUnique({ where: { code: couponCode } }))?.id : null,
        pickupLatitude,
        pickupLongitude,
        deliveryLatitude,
        deliveryLongitude,
        distance,
        fare,
        subtotal,
        tax,
        discount,
        total,
        commission,
        description,
        status: 'PENDING',
        paymentMethod: createOrderDto.paymentMethod || 'CASH',
        deviceToken: resolvedDeviceToken,
        items: items ? {
          create: await Promise.all(items.map(async (item) => {
            const menuItem = await this.prisma.menuItem.findUnique({
              where: { id: item.menuItemId },
            });
            if (!menuItem) {
              throw new NotFoundException(`Menu item with ID ${item.menuItemId} not found`);
            }
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: menuItem.price,
              extrasPrice: item.extrasPrice ?? 0,
              notes: item.notes,
            };
          })),
        } : undefined,
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
        poolZone: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            zoneId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
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
    } else if (userRole === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId },
      });
      if (!restaurant) {
        return [];
      }
      if (restaurant.zoneId) {
        where.OR = [
          { restaurantId: restaurant.id },
          {
            status: 'PENDING',
            poolZoneId: restaurant.zoneId,
          },
          {
            status: 'PENDING',
            poolZoneId: null,
            zoneId: restaurant.zoneId,
          },
        ];
      } else {
        where.restaurantId = restaurant.id;
      }
    } else if (userRole === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver) {
        return [];
      }
      /** السائق «محمّل» بطلب: لا يعرض له طلبات مجمّعة جديدة، فقط ما يخدمه */
      if (!driver.isAvailable) {
        where.driverId = driver.id;
      } else if (driver.zoneId) {
        where.OR = [
          { driverId: driver.id },
          {
            status: 'PENDING',
            OR: [{ poolZoneId: driver.zoneId }, { poolZoneId: null, zoneId: driver.zoneId }],
          },
        ];
      } else {
        where.driverId = driver.id;
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
        poolZone: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            zoneId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
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
        poolZone: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            zoneId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
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
      if (!driver) {
        throw new ForbiddenException('You do not have access to this order');
      }
      const assigned = order.driverId === driver.id;
      const poolId = this.effectivePoolZoneId(order);
      const sameZonePending =
        order.status === 'PENDING' &&
        !!driver.zoneId &&
        !!poolId &&
        driver.zoneId === poolId;
      if (!assigned && !sameZonePending) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    if (userRole === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId },
      });
      if (!restaurant) {
        throw new ForbiddenException('You do not have access to this order');
      }
      const own = order.restaurantId === restaurant.id;
      const poolId = this.effectivePoolZoneId(order);
      const zonePending =
        order.status === 'PENDING' &&
        !!restaurant.zoneId &&
        !!poolId &&
        restaurant.zoneId === poolId;
      if (!own && !zonePending) {
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

    const poolId = this.effectivePoolZoneId(order);
    if (!driver.zoneId) {
      throw new ForbiddenException('يجب ضبط منطقة عمل السائق قبل قبول الطلبات');
    }
    if (!poolId || driver.zoneId !== poolId) {
      throw new ForbiddenException('لا يمكن قبول طلب خارج منطقة عملك');
    }

    const orderInclude = {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      zone: true,
      poolZone: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          address: true,
          latitude: true,
          longitude: true,
          zoneId: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
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
    };

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          driverId,
          status: 'ACCEPTED',
        },
      });
      await tx.driver.update({
        where: { id: driverId },
        data: { isAvailable: false },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: orderInclude,
      });
    });
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
    } else if (userRole === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId },
      });
      if (!restaurant || order.restaurantId !== restaurant.id) {
        throw new ForbiddenException('You do not have permission to update this order');
      }
      if (status !== 'ACCEPTED' || order.status !== 'PENDING') {
        throw new ForbiddenException('المطعم يمكنه فقط قبول الطلب (PENDING → ACCEPTED)');
      }
    }

    // Get order before update to check if status is changing to DELIVERED
    const orderBeforeUpdate = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
      },
    });

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
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            zoneId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (
      (status === 'DELIVERED' || status === 'CANCELED') &&
      order.driverId
    ) {
      await this.prisma.driver.update({
        where: { id: order.driverId },
        data: { isAvailable: true },
      });
    }

    // If order is delivered and payment is completed, create financial transactions
    if (status === 'DELIVERED' && order.paymentStatus === 'PAID') {
      // Get order with restaurant info
      const orderWithRestaurant = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: true },
      });

      // Create income transaction for delivery fee
      if (order.fare && order.fare > 0) {
        await this.transactionsService.create({
          orderId: orderId,
          type: TransactionType.INCOME,
          category: TransactionCategory.DELIVERY_FEE,
          amount: order.fare,
          description: `Delivery fee for order #${orderId}`,
          status: 'COMPLETED',
        });
      }

      // Create income transaction for commission
      if (order.commission && order.commission > 0 && order.restaurantId && orderWithRestaurant) {
        await this.transactionsService.create({
          orderId: orderId,
          restaurantId: order.restaurantId,
          type: TransactionType.INCOME,
          category: TransactionCategory.ORDER_COMMISSION,
          amount: order.commission,
          description: `Commission from order #${orderId} (${orderWithRestaurant.restaurant?.name || 'Restaurant'})`,
          status: 'COMPLETED',
        });
      }
    }

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

  async getAvailableOrders(driverUserId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: driverUserId },
    });
    if (!driver?.zoneId || !driver.isAvailable) {
      return [];
    }
    return this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        OR: [{ poolZoneId: driver.zoneId }, { poolZoneId: null, zoneId: driver.zoneId }],
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
        poolZone: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            zoneId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

