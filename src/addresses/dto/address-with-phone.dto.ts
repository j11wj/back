import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';
import { UpdateAddressDto } from './update-address.dto';

export class CreateAddressPublicDto extends CreateAddressDto {
  @ApiProperty({ description: 'رقم هاتف العميل المسجل (للتعريف بدون JWT)' })
  @IsString()
  @MinLength(8)
  currentPhone: string;
}

export class UpdateAddressPublicDto extends UpdateAddressDto {
  @ApiProperty({ description: 'رقم هاتف العميل المسجل (للتعريف بدون JWT)' })
  @IsString()
  @MinLength(8)
  currentPhone: string;
}
