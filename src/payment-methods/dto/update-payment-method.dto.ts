import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdatePaymentMethodDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  last4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
