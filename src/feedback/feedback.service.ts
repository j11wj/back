import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        userId,
        subject: dto.subject?.trim() || null,
        message: dto.message.trim(),
      },
    });
  }

  async findAll(role?: string, limit = 100) {
    const feedbacks = await this.prisma.feedback.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      ...(role
        ? { where: { user: { role: role.toUpperCase() } } }
        : {}),
    });

    return feedbacks.map(f => ({
      id:        f.id,
      subject:   f.subject,
      message:   f.message,
      createdAt: f.createdAt,
      user: {
        id:    f.user.id,
        name:  f.user.name,
        phone: f.user.phone,
        role:  f.user.role,
      },
    }));
  }
}
