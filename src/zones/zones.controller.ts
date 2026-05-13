import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new zone (Admin only)' })
  @ApiBody({ type: CreateZoneDto })
  @ApiResponse({ status: 201, description: 'Zone successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all delivery zones' })
  @ApiResponse({ status: 200, description: 'List of zones' })
  findAll() {
    return this.zonesService.findAll();
  }

  @Public()
  @Get('preview-fare')
  @ApiOperation({
    summary: 'معاينة أجرة التوصيل حسب المسافة بين المطعم وعنوان التوصيل',
  })
  @ApiResponse({ status: 200, description: 'distance, zone, fare' })
  previewFare(
    @Query('pickupLat') pickupLat: string,
    @Query('pickupLng') pickupLng: string,
    @Query('deliveryLat') deliveryLat: string,
    @Query('deliveryLng') deliveryLng: string,
  ) {
    const pl = parseFloat(pickupLat);
    const pg = parseFloat(pickupLng);
    const dl = parseFloat(deliveryLat);
    const dg = parseFloat(deliveryLng);
    if ([pl, pg, dl, dg].some((n) => Number.isNaN(n))) {
      throw new BadRequestException('إحداثيات غير صالحة');
    }
    return this.zonesService.calculateZoneAndFare(pl, pg, dl, dg);
  }

  @Public()
  @Post('calculate-fare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'حساب أجرة التوصيل الحقيقية — زون المطعم + زون الزبون',
    description:
      'إذا كان المطعم والزبون في نفس الزون يُحتسب سعر الزون مرة واحدة، وإذا كانا في زونين مختلفين يُجمع السعران.',
  })
  @ApiBody({ type: CalculateFareDto })
  @ApiResponse({
    status: 200,
    description: 'fare, fareBreakdown, pickupZone, deliveryZone, distance',
  })
  calculateFare(@Body() dto: CalculateFareDto) {
    return this.zonesService.calculateZoneAndFare(
      dto.pickupLat,
      dto.pickupLng,
      dto.deliveryLat,
      dto.deliveryLng,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get zone by ID' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 200, description: 'Zone details' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update zone (Admin only)' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiBody({ type: UpdateZoneDto })
  @ApiResponse({ status: 200, description: 'Zone updated' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete zone (Admin only)' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 204, description: 'Zone deleted' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
