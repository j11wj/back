import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'أحمد محمد', description: 'الاسم الكامل' })
  @IsString()
  @MinLength(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' })
  name: string;

  @ApiProperty({ example: '07701234567', description: 'رقم الهاتف' })
  @IsString()
  @MinLength(5, { message: 'رقم الهاتف غير صالح' })
  phone: string;
}
