import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

/** تعريف العميل بدون JWT (رقم الهاتف المسجل حالياً) */
export class CurrentPhoneDto {
  @ApiProperty({ description: 'رقم الهاتف المسجل حالياً (للتعريف بدون JWT)' })
  @IsString()
  @MinLength(8)
  currentPhone: string;
}

export class UpdateProfilePublicDto extends CurrentPhoneDto {
  @ApiProperty({ example: 'أحمد محمد', description: 'الاسم الكامل الجديد' })
  @IsString()
  @MinLength(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' })
  name: string;

  @ApiProperty({ example: '07701234567', description: 'رقم الهاتف الجديد' })
  @IsString()
  @MinLength(5, { message: 'رقم الهاتف غير صالح' })
  phone: string;
}

export class UpdateLocalePublicDto extends CurrentPhoneDto {
  @ApiProperty({ enum: ['ar', 'en'], example: 'ar' })
  @IsIn(['ar', 'en'])
  locale: 'ar' | 'en';
}

export class UpdateFcmTokenPublicDto extends CurrentPhoneDto {
  @ApiProperty({
    description: 'FCM device registration token from Firebase Cloud Messaging',
  })
  @IsString()
  @MinLength(10)
  fcmToken: string;
}
