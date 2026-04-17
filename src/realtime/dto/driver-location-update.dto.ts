import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class DriverLocationUpdateDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}

