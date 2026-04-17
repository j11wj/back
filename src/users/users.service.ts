import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/types/user-role.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = dto.phone.trim();

    const phoneTaken = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
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

