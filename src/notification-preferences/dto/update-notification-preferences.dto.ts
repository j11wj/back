import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}
