import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PointDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  lng: number;
}

export class CreateZoneDto {
  @ApiProperty({ description: 'Zone name (e.g., Zone A)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Minimum distance in km (for distance-based zones)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDistance?: number;

  @ApiPropertyOptional({ description: 'Maximum distance in km (for distance-based zones)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiProperty({ description: 'Delivery price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ 
    description: 'Polygon coordinates as array of {lat, lng} points',
    type: [PointDto],
    example: [{ lat: 32.1234, lng: 44.5678 }, { lat: 32.1240, lng: 44.5690 }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  polygon?: PointDto[];
}

