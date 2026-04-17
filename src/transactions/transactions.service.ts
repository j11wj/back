import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    // Verify order exists if provided
    if (createTransactionDto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: createTransactionDto.orderId },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
    }

    // Verify restaurant exists if provided
    if (createTransactionDto.restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: createTransactionDto.restaurantId },
      });
      if (!restaurant) {
        throw new NotFoundException('Restaurant not found');
      }
    }

    return this.prisma.transaction.create({
      data: createTransactionDto,
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll({
    type,
    category,
    restaurantId,
    startDate,
    endDate,
  }: {
    type?: string;
    category?: string;
    restaurantId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSummary({
    startDate,
    endDate,
  }: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...where,
        status: 'COMPLETED',
      },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      transactionCount: transactions.length,
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    await this.findOne(id); // Verify transaction exists

    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verify transaction exists
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id); // Verify transaction exists

    return this.prisma.transaction.update({
      where: { id },
      data: { status },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

