import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@ApiBearerAuth('JWT-auth')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'إرسال ملاحظة أو اقتراح' })
  create(@GetUser() user: { id: string }, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'قائمة كل الملاحظات (للأدمن)' })
  @ApiQuery({ name: 'role', required: false, description: 'فلتر حسب دور المرسل: CUSTOMER | DRIVER | RESTAURANT' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد النتائج (افتراضي: 100)' })
  findAll(
    @Query('role') role?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findAll(role, limit ? parseInt(limit) : 100);
  }
}
