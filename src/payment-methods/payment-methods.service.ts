import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.savedPaymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreatePaymentMethodDto) {
    if (dto.isDefault) {
      await this.prisma.savedPaymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.savedPaymentMethod.create({
      data: {
        userId,
        label: dto.label.trim(),
        last4: dto.last4,
        brand: dto.brand.trim().toUpperCase(),
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdatePaymentMethodDto) {
    const row = await this.prisma.savedPaymentMethod.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('البطاقة غير موجودة');
    }
    if (dto.isDefault === true) {
      await this.prisma.savedPaymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.savedPaymentMethod.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.last4 !== undefined && { last4: dto.last4 }),
        ...(dto.brand !== undefined && { brand: dto.brand.trim().toUpperCase() }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.savedPaymentMethod.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('البطاقة غير موجودة');
    }
    await this.prisma.savedPaymentMethod.delete({ where: { id } });
  }
}
