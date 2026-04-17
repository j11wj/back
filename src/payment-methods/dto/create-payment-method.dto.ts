import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';

/** تخزين بيانات وهمية آمنة (آخر 4 أرقام + نوع البطاقة) — لا تُخزَّن بيانات كاملة. */
export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'بطاقتي الرئيسية' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: '4242' })
  @IsString()
  @Length(4, 4)
  last4: string;

  @ApiProperty({ example: 'VISA' })
  @IsString()
  @MinLength(2)
  brand: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
