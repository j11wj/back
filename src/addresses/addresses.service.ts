import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.savedAddress.create({
      data: {
        userId,
        label: dto.label.trim(),
        addressLine: dto.addressLine.trim(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const row = await this.prisma.savedAddress.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('العنوان غير موجود');
    }
    if (dto.isDefault === true) {
      await this.prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.savedAddress.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.addressLine !== undefined && {
          addressLine: dto.addressLine.trim(),
        }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.savedAddress.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('العنوان غير موجود');
    }
    await this.prisma.savedAddress.delete({ where: { id } });
  }
}
