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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentPhoneDto,
  UpdateFcmTokenPublicDto,
  UpdateLocalePublicDto,
  UpdateProfilePublicDto,
} from './dto/user-public.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('profile')
  @ApiOperation({
    summary: 'ملف العميل (بدون JWT) — يمرّر رقم الهاتف كمعرّف',
  })
  @ApiQuery({ name: 'phone', required: true, description: 'رقم هاتف العميل المسجل' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getProfile(@Query('phone') phone: string) {
    return this.usersService.getProfileByPhone(phone);
  }

  @Public()
  @Patch('profile')
  @ApiOperation({
    summary: 'تحديث اسم/هاتف العميل (بدون JWT) — currentPhone للتعريف',
  })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 409, description: 'Phone already in use' })
  updateProfile(@Body() dto: UpdateProfilePublicDto) {
    return this.usersService.updateProfilePublic(dto);
  }

  @Public()
  @Patch('locale')
  @ApiOperation({ summary: 'تحديث لغة الواجهة (بدون JWT)' })
  updateLocale(@Body() dto: UpdateLocalePublicDto) {
    return this.usersService.updateLocalePublic(dto);
  }

  @Public()
  @Patch('fcm-token')
  @ApiOperation({
    summary: 'تسجيل توكن FCM (بدون JWT) — currentPhone للتعريف',
  })
  updateFcmToken(@Body() dto: UpdateFcmTokenPublicDto) {
    return this.usersService.updateFcmTokenPublic(dto);
  }

  @Patch('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'تسجيل توكن FCM للمستخدم الحالي (JWT — لأي دور)',
  })
  updateMyFcmToken(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(req.user.id, dto);
  }

  @Patch('me/driver-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'تحديث زون السائق الحالي (JWT — DRIVER فقط)' })
  updateDriverInfo(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: { zoneId?: string; fcmToken?: string },
  ) {
    return this.usersService.updateDriverInfo(req.user.id, dto);
  }

  @Public()
  @Delete('profile')
  @ApiOperation({ summary: 'حذف حساب العميل (بدون JWT)' })
  deleteProfile(@Body() dto: CurrentPhoneDto) {
    return this.usersService.deleteProfilePublic(dto.currentPhone);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post('send-notification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'إرسال إشعار FCM (Admin) — لمستخدم معين أو لكل العملاء' })
  @ApiResponse({ status: 200, description: 'نتيجة الإرسال' })
  sendNotification(
    @Body() dto: { title: string; body: string; userId?: string },
  ) {
    return this.usersService.sendAdminNotification(dto);
  }
}
