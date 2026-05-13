import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

function platformRevenueFromOrder(o: {
  commission: number;
  tax: number;
  fare: number | null;
}): number {
  return (o.commission ?? 0) + (o.tax ?? 0) + (o.fare ?? 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(q: FinanceQueryDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(q.from);
      if (q.to)   (where.createdAt as Prisma.DateTimeFilter).lte = new Date(q.to);
    }
    if (q.restaurantId) where.restaurantId = q.restaurantId;
    if (q.driverId)     where.driver = { userId: q.driverId };
    if (q.status) {
      where.status = q.status;
    } else if (q.excludeCancelled !== false) {
      where.status = { not: 'CANCELED' };
    }
    return where;
  }

  /** تقرير مالي لكل طلب — مع تفاصيل الأصناف */
  async getOrdersReport(q: FinanceQueryDto) {
    const where    = this.buildWhere(q);
    const page     = q.page ?? 1;
    const pageSize = q.pageSize ?? 200;
    const skip     = (page - 1) * pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          status: true,
          createdAt: true,
          subtotal: true,
          tax: true,
          discount: true,
          fare: true,
          total: true,
          commission: true,
          paymentMethod: true,
          distance: true,
          restaurant: {
            select: {
              id: true, name: true, phone: true, address: true,
              commissionRate: true,
              category: { select: { name: true } },
            },
          },
          customer:  { select: { id: true, name: true, phone: true } },
          driver: {
            select: {
              id: true,
              licenseNumber: true,
              vehicleType: true,
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          items: {
            select: {
              quantity: true,
              price: true,
              extrasPrice: true,
              notes: true,
              menuItem: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = rows.map((o) => {
      const platformRevenue = platformRevenueFromOrder({
        commission: o.commission,
        tax: o.tax,
        fare: o.fare,
      });
      const tot = o.total ?? 0;
      const sub = o.subtotal ?? 0;
      return {
        orderId:   o.id,
        status:    o.status,
        createdAt: o.createdAt,
        subtotal:  o.subtotal,
        tax:       o.tax,
        discount:  o.discount,
        fare:      o.fare,
        total:     o.total,
        distance:  o.distance,
        commission:     o.commission,
        platformRevenue: round2(platformRevenue),
        profitMarginPercentOfTotal:  tot > 0 ? round2((100 * platformRevenue) / tot) : 0,
        commissionPercentOfSubtotal: sub > 0 ? round2((100 * (o.commission ?? 0)) / sub) : 0,
        paymentMethod: o.paymentMethod,
        customer:   o.customer,
        restaurant: o.restaurant ?? null,
        driver:     o.driver ?? null,
        items: o.items.map(i => ({
          name:        i.menuItem?.name ?? '—',
          quantity:    i.quantity,
          unitPrice:   i.price,
          extrasPrice: i.extrasPrice ?? 0,
          lineTotal:   round2(i.price * i.quantity + (i.extrasPrice ?? 0)),
          notes:       i.notes ?? null,
        })),
      };
    });

    return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  /** ملخص مالي مجمّع */
  async getSummary(q: FinanceQueryDto) {
    const where = this.buildWhere(q);
    const agg = await this.prisma.order.aggregate({
      where,
      _count: { id: true },
      _sum: { subtotal: true, tax: true, discount: true, fare: true, total: true, commission: true },
    });

    const [oSub, oTax, oDisc, oFare, oTot, oComm, cnt] = [
      agg._sum.subtotal ?? 0, agg._sum.tax ?? 0, agg._sum.discount ?? 0,
      agg._sum.fare ?? 0, agg._sum.total ?? 0, agg._sum.commission ?? 0,
      agg._count.id,
    ];

    const platformRevenue = oComm + oTax + oFare;
    const avgOrderTotal  = cnt > 0 ? round2(oTot / cnt) : 0;
    const avgPlatformRev = cnt > 0 ? round2(platformRevenue / cnt) : 0;
    const avgMargin      = oTot > 0 ? round2((100 * platformRevenue) / oTot) : 0;

    return {
      orderCount: cnt,
      sums: {
        subtotal: round2(oSub), tax: round2(oTax), discount: round2(oDisc),
        fare: round2(oFare), total: round2(oTot), commission: round2(oComm),
        platformRevenue: round2(platformRevenue),
      },
      averages: {
        orderTotal: avgOrderTotal,
        platformRevenuePerOrder: avgPlatformRev,
        profitMarginPercentOfTotal: avgMargin,
      },
      filtersApplied: {
        from: q.from ?? null, to: q.to ?? null,
        restaurantId: q.restaurantId ?? null,
        driverId: q.driverId ?? null,
        status: q.status ?? null,
        excludeCancelled: q.status ? false : q.excludeCancelled !== false,
      },
    };
  }

  /** تقرير مطعم: ملخص كامل بكل الطلبات والأصناف والعمولة لفاتورة */
  async getRestaurantInvoice(restaurantId: string, from?: string, to?: string) {
    const q: FinanceQueryDto = { restaurantId, from, to, pageSize: 200, page: 1 };
    const [report, summary, restaurant] = await Promise.all([
      this.getOrdersReport(q),
      this.getSummary(q),
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true, name: true, phone: true, address: true,
          commissionRate: true, email: true,
          category: { select: { name: true } },
        },
      }),
    ]);
    return { restaurant, orders: report.data, summary };
  }

  /** تقرير سائق: كل التوصيلات ورسومها */
  async getDriverInvoice(userId: string, from?: string, to?: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId },
      select: {
        id: true, licenseNumber: true, vehicleType: true, isAvailable: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
        zone: { select: { name: true } },
      },
    });
    if (!driver) return { driver: null, orders: [], summary: null };

    const q: FinanceQueryDto = { driverId: userId, from, to, pageSize: 200, page: 1 };
    const [report, summary] = await Promise.all([
      this.getOrdersReport(q),
      this.getSummary(q),
    ]);
    return { driver, orders: report.data, summary };
  }
}
