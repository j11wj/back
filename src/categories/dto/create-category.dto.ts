import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Pizza', description: 'Category name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Delicious pizza varieties', description: 'Category description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/pizza.jpg', description: 'Category image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: true, description: 'Category active status', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

