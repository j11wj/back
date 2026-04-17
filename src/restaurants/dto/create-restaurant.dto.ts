import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pizza Palace', description: 'Restaurant name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'Best pizza in town',
    description: 'Restaurant description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'https://example.com/restaurant.jpg',
    description: 'Restaurant image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Restaurant phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'contact@pizzapalace.com',
    description: 'Restaurant email',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '123 Main St, City',
    description: 'Restaurant address',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 40.7128,
    description: 'Restaurant latitude',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    example: -74.0060,
    description: 'Restaurant longitude',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: 'category-uuid',
    description: 'Category ID',
  })
  @IsString()
  categoryId: string;

  @ApiProperty({
    example: true,
    description: 'Restaurant active status',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: true,
    description: 'Restaurant open status',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiProperty({
    example: 15.0,
    description: 'Commission rate percentage (e.g., 15 for 15%)',
    required: false,
    default: 15.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

