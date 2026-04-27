import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('notification-preferences')
@ApiBearerAuth('JWT-auth')
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'تفضيلات الإشعارات للمستخدم الحالي' })
  getMine(@GetUser() user: { id: string }) {
    return this.notificationPreferencesService.getOrCreate(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'تحديث تفضيلات الإشعارات' })
  patchMine(
    @GetUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationPreferencesService.update(user.id, dto);
  }
}
