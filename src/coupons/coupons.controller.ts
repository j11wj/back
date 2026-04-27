import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  @ApiResponse({ status: 201, description: 'Coupon successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input or code already exists' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of coupons' })
  findAll(@Query('isActive') isActive?: string) {
    return this.couponsService.findAll(
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Public()
  @Get('code/:code')
  @ApiOperation({ summary: 'Get coupon by code' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  findByCode(@Param('code') code: string) {
    return this.couponsService.findByCode(code);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update coupon (Admin only)' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete coupon (Admin only)' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 204, description: 'Coupon deleted' })
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle coupon active status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon status toggled' })
  toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleActive(id);
  }
}

