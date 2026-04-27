import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  iraqMobileLookupCandidates,
  normalizePhoneDigits,
} from '../common/utils/phone-digits';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePhone(raw: string): string {
    return normalizePhoneDigits(raw);
  }

  /** يعيد userId لعميل مسجّل برقم الهاتف */
  async resolveCustomerId(rawPhone: string): Promise<string> {
    const phone = this.normalizePhone(rawPhone);
    if (phone.length < 8) {
      throw new BadRequestException('رقم الهاتف غير صالح');
    }
    const keys = iraqMobileLookupCandidates(phone);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: keys }, role: 'CUSTOMER' },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('هذا المسار للعملاء فقط');
    }
    return user.id;
  }

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
