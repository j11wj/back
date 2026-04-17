import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(userId: string) {
    const rows = await this.prisma.survey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });
    return rows.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      questionsJson: s.questionsJson,
      isActive: s.isActive,
      createdAt: s.createdAt,
      hasAnswered: s.responses.length > 0,
    }));
  }

  async submit(userId: string, surveyId: string, dto: SubmitSurveyResponseDto) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, isActive: true },
      select: { id: true },
    });
    if (!survey) {
      throw new NotFoundException('الاستبيان غير موجود');
    }
    return this.prisma.surveyResponse.upsert({
      where: { userId_surveyId: { userId, surveyId } },
      update: {
        answersJson: JSON.stringify(dto.answers),
      },
      create: {
        userId,
        surveyId,
        answersJson: JSON.stringify(dto.answers),
      },
    });
  }
}
