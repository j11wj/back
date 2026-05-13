import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class RegisterRestaurantDto {
  // Owner (user) fields
  @ApiProperty({ example: 'owner@restaurant.com', description: 'البريد الإلكتروني لصاحب المطعم' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'كلمة المرور (6 أحرف على الأقل)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'أحمد محمد', description: 'اسم صاحب الحساب' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+966501234567', description: 'رقم الجوال', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  // Restaurant fields
  @ApiProperty({ example: 'مطعم الذوق الرفيع', description: 'اسم المطعم' })
  @IsString()
  @MinLength(2)
  restaurantName: string;

  @ApiProperty({ example: 'category-uuid', description: 'معرف التصنيف' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'وصف المطعم', description: 'وصف المطعم', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'الرياض، حي النخيل', description: 'العنوان', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '+966501234567', description: 'هاتف المطعم', required: false })
  @IsOptional()
  @IsString()
  restaurantPhone?: string;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'رابط صورة المطعم', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 24.7136, description: 'خط العرض', required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ example: 46.6753, description: 'خط الطول', required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ example: 'zone-uuid', description: 'منطقة المطعم', required: false })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: true, description: 'المطعم مفعّل', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: true, description: 'المطعم مفتوح', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiProperty({ example: 15, description: 'نسبة العمولة %', required: false, default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
