import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.notificationPreference.create({
      data: { userId },
    });
  }

  async update(userId: string, dto: UpdateNotificationPreferencesDto) {
    await this.getOrCreate(userId);
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...(dto.orderUpdates !== undefined && {
          orderUpdates: dto.orderUpdates,
        }),
        ...(dto.promotions !== undefined && { promotions: dto.promotions }),
        ...(dto.marketing !== undefined && { marketing: dto.marketing }),
      },
    });
  }
}
