import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import { SurveysService } from './surveys.service';

@ApiTags('surveys')
@ApiBearerAuth('JWT-auth')
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get('active')
  @ApiOperation({ summary: 'قائمة الاستبيانات الفعالة للمستخدم الحالي' })
  listActive(@GetUser() user: { id: string }) {
    return this.surveysService.listActive(user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'إرسال إجابات استبيان' })
  submit(
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SubmitSurveyResponseDto,
  ) {
    return this.surveysService.submit(user.id, id, dto);
  }
}
