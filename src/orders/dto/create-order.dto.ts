import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateOrderDto {
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

  @ApiProperty({ example: 'Food delivery', description: 'Order description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

