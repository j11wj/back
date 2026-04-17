import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ required: false, example: 'اقتراح' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'أود إضافة خيار الدفع عند الاستلام في كل المناطق.' })
  @IsString()
  @MinLength(5)
  message: string;
}
