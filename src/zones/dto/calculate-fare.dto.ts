import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateFareDto {
  @ApiProperty({ description: 'خط عرض موقع الاستلام (المطعم)', example: 32.5 })
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ description: 'خط طول موقع الاستلام (المطعم)', example: 44.4 })
  @IsNumber()
  pickupLng: number;

  @ApiProperty({ description: 'خط عرض موقع التوصيل (الزبون)', example: 32.6 })
  @IsNumber()
  deliveryLat: number;

  @ApiProperty({ description: 'خط طول موقع التوصيل (الزبون)', example: 44.5 })
  @IsNumber()
  deliveryLng: number;
}
