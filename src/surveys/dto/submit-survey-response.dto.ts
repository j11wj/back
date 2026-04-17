import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitSurveyResponseDto {
  @ApiProperty({
    example: { q1: 5, q2: 'خدمة ممتازة' },
    description: 'JSON object of questionId -> answer',
  })
  @IsObject()
  answers: Record<string, unknown>;
}
