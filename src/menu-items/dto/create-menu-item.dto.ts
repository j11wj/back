import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MenuOptionRowDto } from './menu-option-row.dto';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Restaurant ID' })
  @IsString()
  restaurantId: string;

  @ApiProperty({ description: 'Item name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Item image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: 'Item price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Item category (e.g., Appetizer, Main Course)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Is item available', default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Is vegetarian', default: false })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiPropertyOptional({ description: 'Is vegan', default: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ description: 'Preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  preparationTime?: number;

  @ApiPropertyOptional({ type: [MenuOptionRowDto], description: 'صلصات مقترحة لهذا الطبق' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOptionRowDto)
  suggestedSauces?: MenuOptionRowDto[];

  @ApiPropertyOptional({ type: [MenuOptionRowDto], description: 'أضافات مقترحة لهذا الطبق' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOptionRowDto)
  suggestedAddons?: MenuOptionRowDto[];
}

