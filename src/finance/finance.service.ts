import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

/** إيراد المنصة المقدّر: عمولة + ضريبة + أجرة التوصيل (كما تُسجّل في الطلب) */
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
      if (q.from) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(q.from);
      }
      if (q.to) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(q.to);
      }
    }
    if (q.restaurantId) {
      where.restaurantId = q.restaurantId;
    }
    if (q.status) {
      where.status = q.status;
    } else if (q.excludeCancelled !== false) {
      where.status = { not: 'CANCELED' };
    }
    return where;
  }

  /**
   * تقرير مالي لكل طلب: مبالغ، إيراد المنصة، ونسب مئوية.
   * - `profitMarginPercentOfTotal`: نسبة (عمولة+ضريبة+توصيل) من إجمالي الفاتورة
   * - `commissionPercentOfSubtotal`: نسبة العمولة من قيمة الأصناف
   */
  async getOrdersReport(q: FinanceQueryDto) {
    const where = this.buildWhere(q);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

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
          restaurant: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
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
      const total = o.total ?? 0;
      const sub = o.subtotal ?? 0;
      const profitMarginPercentOfTotal =
        total > 0 ? round2((100 * platformRevenue) / total) : 0;
      const commissionPercentOfSubtotal =
        sub > 0 ? round2((100 * (o.commission ?? 0)) / sub) : 0;
      return {
        orderId: o.id,
        status: o.status,
        createdAt: o.createdAt,
        subtotal: o.subtotal,
        tax: o.tax,
        discount: o.discount,
        fare: o.fare,
        total: o.total,
        commission: o.commission,
        platformRevenue: round2(platformRevenue),
        profitMarginPercentOfTotal,
        commissionPercentOfSubtotal,
        paymentMethod: o.paymentMethod,
        customer: {
          id: o.customer.id,
          name: o.customer.name,
          phone: o.customer.phone,
        },
        restaurant: o.restaurant
          ? { id: o.restaurant.id, name: o.restaurant.name }
          : null,
      };
    });

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * ملخص مالي: إجماليات ومتوسط نسبة هامش إيراد المنصة.
   */
  async getSummary(q: FinanceQueryDto) {
    const where = this.buildWhere(q);
    const agg = await this.prisma.order.aggregate({
      where,
      _count: { id: true },
      _sum: {
        subtotal: true,
        tax: true,
        discount: true,
        fare: true,
        total: true,
        commission: true,
      },
    });

    const [
      oSub,
      oTax,
      oDisc,
      oFare,
      oTot,
      oComm,
      cnt,
    ] = [
      agg._sum.subtotal ?? 0,
      agg._sum.tax ?? 0,
      agg._sum.discount ?? 0,
      agg._sum.fare ?? 0,
      agg._sum.total ?? 0,
      agg._sum.commission ?? 0,
      agg._count.id,
    ];

    const platformRevenue = oComm + oTax + oFare;
    const avgOrderTotal = cnt > 0 ? round2(oTot / cnt) : 0;
    const avgPlatformRevenuePerOrder = cnt > 0 ? round2(platformRevenue / cnt) : 0;
    const averageProfitMarginPercentOfTotal =
      oTot > 0 ? round2((100 * platformRevenue) / oTot) : 0;

    return {
      orderCount: cnt,
      sums: {
        subtotal: round2(oSub),
        tax: round2(oTax),
        discount: round2(oDisc),
        fare: round2(oFare),
        total: round2(oTot),
        commission: round2(oComm),
        platformRevenue: round2(platformRevenue),
      },
      averages: {
        orderTotal: avgOrderTotal,
        platformRevenuePerOrder: avgPlatformRevenuePerOrder,
        profitMarginPercentOfTotal: averageProfitMarginPercentOfTotal,
      },
      filtersApplied: {
        from: q.from ?? null,
        to: q.to ?? null,
        restaurantId: q.restaurantId ?? null,
        status: q.status ?? null,
        excludeCancelled: q.status ? false : q.excludeCancelled !== false,
      },
    };
  }
}
