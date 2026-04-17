import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'المنزل' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: 'الحلة، حي الجامعة' })
  @IsString()
  @MinLength(3)
  addressLine: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
