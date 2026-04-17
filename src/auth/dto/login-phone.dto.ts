import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginPhoneDto {
  @ApiProperty({ example: '07801234567', description: 'رقم الهاتف' })
  @IsString()
  @MinLength(8, { message: 'رقم الهاتف قصير جداً' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'أحمد محمد', description: 'الاسم الكامل' })
  @IsString()
  @MinLength(2, { message: 'الاسم قصير جداً' })
  @MaxLength(120)
  name: string;
}
