import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OrderStatus } from '../../common/types/order-status.type';

export class UpdateOrderStatusDto {
  @ApiProperty({ 
    example: 'ON_THE_WAY', 
    enum: ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'],
    description: 'New order status' 
  })
  @IsIn(['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'])
  status: OrderStatus;
}

