import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/types/user-role.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import {
  UpdateFcmTokenPublicDto,
  UpdateLocalePublicDto,
  UpdateProfilePublicDto,
} from './dto/user-public.dto';
import {
  canonicalizeIraqMobileForStorage,
  iraqMobileLookupCandidates,
  normalizePhoneDigits,
} from '../common/utils/phone-digits';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(raw: string): string {
    return normalizePhoneDigits(raw);
  }

  async findAll(role?: UserRole) {
    const where = role ? { role } : {};
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        locale: true,
        createdAt: true,
        driver: {
          select: {
            id: true,
            licenseNumber: true,
            vehicleType: true,
            isAvailable: true,
            zoneId: true,
            lastLatitude: true,
            lastLongitude: true,
            lastLocationAt: true,
            orders: {
              where: { status: { in: ['ACCEPTED', 'ON_THE_WAY'] } },
              select: { id: true, status: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        locale: true,
        createdAt: true,
        driver: {
          select: {
            id: true,
            licenseNumber: true,
            vehicleType: true,
            isAvailable: true,
            zoneId: true,
            lastLatitude: true,
            lastLongitude: true,
            lastLocationAt: true,
            orders: {
              where: { status: { in: ['ACCEPTED', 'ON_THE_WAY'] } },
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  /** ملف عميل بدون JWT — التعريف برقم الهاتف */
  async getProfileByPhone(rawPhone: string) {
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
    return this.findOne(user.id);
  }

  async updateProfilePublic(dto: UpdateProfilePublicDto) {
    const cur = this.normalizePhone(dto.currentPhone);
    const curKeys = iraqMobileLookupCandidates(cur);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: curKeys }, role: 'CUSTOMER' },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('هذا المسار للعملاء فقط');
    }
    return this.updateProfile(user.id, {
      name: dto.name,
      phone: dto.phone,
    });
  }

  async updateLocalePublic(dto: UpdateLocalePublicDto) {
    const cur = this.normalizePhone(dto.currentPhone);
    const curKeys = iraqMobileLookupCandidates(cur);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: curKeys }, role: 'CUSTOMER' },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('هذا المسار للعملاء فقط');
    }
    return this.updateLocale(user.id, { locale: dto.locale });
  }

  async updateFcmTokenPublic(dto: UpdateFcmTokenPublicDto) {
    const cur = this.normalizePhone(dto.currentPhone);
    const curKeys = iraqMobileLookupCandidates(cur);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: curKeys }, role: 'CUSTOMER' },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('هذا المسار للعملاء فقط');
    }
    return this.updateFcmToken(user.id, { fcmToken: dto.fcmToken });
  }

  async deleteProfilePublic(currentPhoneRaw: string) {
    const cur = this.normalizePhone(currentPhoneRaw);
    const curKeys = iraqMobileLookupCandidates(cur);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: curKeys }, role: 'CUSTOMER' },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('هذا المسار للعملاء فقط');
    }
    return this.deleteProfile(user.id);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = canonicalizeIraqMobileForStorage(this.normalizePhone(dto.phone));

    const phoneConflictKeys = iraqMobileLookupCandidates(normalizedPhone);
    const phoneTaken = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneConflictKeys },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (phoneTaken) {
      throw new ConflictException('رقم الهاتف مستخدم من حساب آخر');
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: normalizedName,
          phone: normalizedPhone,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('رقم الهاتف أو البريد مستخدم مسبقاً');
      }
      throw e;
    }

    return this.findOne(userId);
  }

  async updateLocale(userId: string, dto: UpdateLocaleDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { locale: dto.locale },
    });
    return this.findOne(userId);
  }

  async updateFcmToken(userId: string, dto: UpdateFcmTokenDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: dto.fcmToken.trim() },
    });
    return { ok: true, message: 'تم تسجيل توكن الإشعارات' };
  }

  async deleteProfile(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'تم حذف الحساب بنجاح' };
  }
}

