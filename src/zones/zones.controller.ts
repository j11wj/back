import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('zones')
@ApiBearerAuth('JWT-auth')
@Controller('zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all delivery zones' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get zone by ID' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 200, description: 'Zone details' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }
}

