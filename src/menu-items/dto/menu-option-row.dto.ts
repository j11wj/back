import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

/** صف واحد: اسم + سعر (دينار) لصلصة أو إضافة مقترحة */
export class MenuOptionRowDto {
  @ApiProperty({ example: 'صوص ثوم وليمون' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1500, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;
}
