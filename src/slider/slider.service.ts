import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeSliderDto } from './dto/create-home-slider.dto';
import { UpdateHomeSliderDto } from './dto/update-home-slider.dto';
import { PushService } from '../push/push.service';

@Injectable()
export class SliderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async findActive() {
    return this.prisma.homeSlider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findAll() {
    return this.prisma.homeSlider.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.homeSlider.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('السلايدر غير موجود');
    return row;
  }

  async create(dto: CreateHomeSliderDto) {
    const { notifyUsers, notificationTitle, notificationBody, ...data } = dto;
    const row = await this.prisma.homeSlider.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        imageUrl: data.imageUrl,
        actionUrl: data.actionUrl,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    const shouldNotify = notifyUsers !== false;
    if (shouldNotify) {
      const titleN = (notificationTitle ?? row.title).trim();
      const bodyN = (
        notificationBody ??
        row.subtitle ??
        'عرض جديد — اطّلع في التطبيق'
      ).trim();
      await this.push.notifyCustomersPromo({
        title: titleN,
        body: bodyN,
        data: {
          type: 'home_slider',
          slideId: row.id,
          ...(row.actionUrl ? { actionUrl: row.actionUrl } : {}),
        },
      });
    }

    return row;
  }

  async update(id: string, dto: UpdateHomeSliderDto) {
    await this.findOne(id);
    const { notifyUsers, notificationTitle, notificationBody, ...fields } = dto;
    const data: {
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      actionUrl?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    } = {};
    if (fields.title !== undefined) data.title = fields.title;
    if (fields.subtitle !== undefined) data.subtitle = fields.subtitle;
    if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl;
    if (fields.actionUrl !== undefined) data.actionUrl = fields.actionUrl;
    if (fields.sortOrder !== undefined) data.sortOrder = fields.sortOrder;
    if (fields.isActive !== undefined) data.isActive = fields.isActive;
    const row =
      Object.keys(data).length > 0
        ? await this.prisma.homeSlider.update({ where: { id }, data })
        : await this.findOne(id);
    if (notifyUsers === true) {
      const titleN = (notificationTitle ?? row.title).trim();
      const bodyN = (
        notificationBody ??
        row.subtitle ??
        'تم تحديث عرض'
      ).trim();
      await this.push.notifyCustomersPromo({
        title: titleN,
        body: bodyN,
        data: {
          type: 'home_slider',
          slideId: row.id,
          ...(row.actionUrl ? { actionUrl: row.actionUrl } : {}),
        },
      });
    }
    return row;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.homeSlider.delete({ where: { id } });
  }
}
