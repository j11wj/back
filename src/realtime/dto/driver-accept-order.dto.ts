import { IsString, IsNotEmpty } from 'class-validator';

export class DriverAcceptOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

