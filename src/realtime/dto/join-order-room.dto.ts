import { IsString, IsNotEmpty } from 'class-validator';

export class JoinOrderRoomDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

