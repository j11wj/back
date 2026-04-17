import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon code (must be unique)' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type: PERCENTAGE or FIXED', enum: ['PERCENTAGE', 'FIXED'] })
  @IsString()
  discountType: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ description: 'Discount value (percentage 0-100 or fixed amount)' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Minimum order amount to use coupon' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount (for percentage coupons)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ description: 'Valid from date (ISO string)' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: 'Valid until date (ISO string)' })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({ description: 'Maximum number of uses (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Is coupon active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

