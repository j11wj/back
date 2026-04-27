import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  CreateAddressPublicDto,
  UpdateAddressPublicDto,
} from './dto/address-with-phone.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'قائمة العناوين للمستخدم الحالي (JWT)' })
  @ApiResponse({ status: 200 })
  findAllMine(@Req() req: Request & { user: { id: string } }) {
    return this.addressesService.findAll(req.user.id);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'إضافة عنوان للمستخدم الحالي (JWT)' })
  @ApiResponse({ status: 201 })
  createMine(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(req.user.id, dto);
  }

  @Patch('me/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'تعديل عنوان للمستخدم الحالي (JWT)' })
  updateMine(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(req.user.id, id, dto);
  }

  @Delete('me/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف عنوان للمستخدم الحالي (JWT)' })
  removeMine(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(req.user.id, id);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'قائمة العناوين المحفوظة (بدون JWT) — query: phone',
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query('phone') phone: string) {
    if (!phone?.trim()) {
      throw new BadRequestException('رقم الهاتف مطلوب (?phone=)');
    }
    const userId = await this.addressesService.resolveCustomerId(phone);
    return this.addressesService.findAll(userId);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'إضافة عنوان (بدون JWT) — currentPhone في الجسم' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateAddressPublicDto) {
    const { currentPhone, ...rest } = dto;
    const userId = await this.addressesService.resolveCustomerId(currentPhone);
    return this.addressesService.create(userId, rest as CreateAddressDto);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'تعديل عنوان (بدون JWT)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAddressPublicDto,
  ) {
    const { currentPhone, ...rest } = dto;
    const userId = await this.addressesService.resolveCustomerId(currentPhone);
    return this.addressesService.update(userId, id, rest as UpdateAddressDto);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: 'حذف عنوان (بدون JWT) — query: phone' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string, @Query('phone') phone: string) {
    if (!phone?.trim()) {
      throw new BadRequestException('رقم الهاتف مطلوب (?phone=)');
    }
    const userId = await this.addressesService.resolveCustomerId(phone);
    return this.addressesService.remove(userId, id);
  }
}
