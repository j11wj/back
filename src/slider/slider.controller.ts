import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateHomeSliderDto } from './dto/create-home-slider.dto';
import { UpdateHomeSliderDto } from './dto/update-home-slider.dto';
import { SliderService } from './slider.service';

@ApiTags('home-slider')
@Controller('home-slider')
export class SliderController {
  constructor(private readonly sliderService: SliderService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'قائمة شرائح الصفحة الرئيسية (الفعّالة فقط)' })
  @ApiResponse({ status: 200, description: 'List of active slides' })
  findActive() {
    return this.sliderService.findActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'كل شرائح السلايدر (للأدمن)' })
  @ApiResponse({ status: 200, description: 'List of all slides' })
  findAllAdmin() {
    return this.sliderService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'تفاصيل سلايدر' })
  findOne(@Param('id') id: string) {
    return this.sliderService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'إضافة شريحة سلايدر (يرسل إشعار FCM إن notifyUsers=true وFirebase مضبوط)',
  })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() dto: CreateHomeSliderDto) {
    return this.sliderService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'تعديل سلايدر — إن أرسلت notifyUsers=true تُرسل إشعارات',
  })
  update(@Param('id') id: string, @Body() dto: UpdateHomeSliderDto) {
    return this.sliderService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'حذف سلايدر' })
  remove(@Param('id') id: string) {
    return this.sliderService.remove(id);
  }
}
