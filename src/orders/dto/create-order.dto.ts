import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ description: 'Menu item ID' })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'مجموع سعر الصلصات والأضافات لهذا السطر بالدينار (للسلة كاملة)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500000)
  extrasPrice?: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'رقم هاتف الزبون (أرقام فقط أو مع 0)' })
  @IsString()
  @MinLength(8)
  customerPhone: string;

  @ApiProperty({ description: 'الاسم الكامل للزبون (يطابق تسجيل الدخول بالهاتف)' })
  @IsString()
  @MinLength(2)
  customerName: string;

  @ApiProperty({ description: 'توكن FCM للجهاز لإشعارات حالة الطلب' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  fcmToken?: string;

  @ApiPropertyOptional({ description: 'توكن الجهاز (بديل عن fcmToken)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  deviceToken?: string;

  @ApiProperty({ example: 40.7128, description: 'Pickup location latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude: number;

  @ApiProperty({ example: -74.0060, description: 'Pickup location longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude: number;

  @ApiProperty({ example: 40.7589, description: 'Delivery location latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  deliveryLatitude: number;

  @ApiProperty({ example: -73.9851, description: 'Delivery location longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  deliveryLongitude: number;

  @ApiProperty({ example: 'restaurant-uuid', description: 'Restaurant ID (for food orders)', required: false })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @ApiPropertyOptional({ description: 'Coupon code', example: 'SAVE20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Order items (for food orders)', type: [OrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({ example: 'Food delivery', description: 'Order description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Payment method', enum: ['CASH', 'CARD', 'ONLINE'], default: 'CASH' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

