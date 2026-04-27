import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHomeSliderDto {
  @ApiProperty({ example: 'خصم 20% على المشاوي' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'صالح حتى نهاية الأسبوع' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ description: 'رابط صورة البانر' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'رابط عند الضغط (اختياري)' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ default: 0, description: 'ترتيب العرض' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'إرسال إشعار FCM لعملاء اختاروا استلام العروض',
  })
  @IsOptional()
  @IsBoolean()
  notifyUsers?: boolean;

  @ApiPropertyOptional({ description: 'عنوان الإشعار (افتراضي: title)' })
  @IsOptional()
  @IsString()
  notificationTitle?: string;

  @ApiPropertyOptional({ description: 'نص الإشعار' })
  @IsOptional()
  @IsString()
  notificationBody?: string;
}
