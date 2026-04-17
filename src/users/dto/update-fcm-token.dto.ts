import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    description: 'FCM device registration token from Firebase Cloud Messaging',
  })
  @IsString()
  @MinLength(10)
  fcmToken: string;
}
