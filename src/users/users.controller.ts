import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/types/user-role.type';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  getProfile(@GetUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile (name, phone)' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 409, description: 'Phone already in use' })
  updateProfile(@GetUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('locale')
  @ApiOperation({ summary: 'Update current user locale' })
  updateLocale(@GetUser() user: any, @Body() dto: UpdateLocaleDto) {
    return this.usersService.updateLocale(user.id, dto);
  }

  @Patch('fcm-token')
  @ApiOperation({
    summary: 'تسجيل توكن FCM الخاص بالجهاز لإرسال الإشعارات عبر Firebase',
  })
  updateFcmToken(@GetUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.usersService.updateFcmToken(user.id, dto);
  }

  @Delete('profile')
  @ApiOperation({ summary: 'Delete current user account' })
  deleteProfile(@GetUser() user: any) {
    return this.usersService.deleteProfile(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}

