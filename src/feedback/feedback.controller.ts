import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@ApiBearerAuth('JWT-auth')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'إرسال ملاحظة أو اقتراح' })
  create(@GetUser() user: { id: string }, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user.id, dto);
  }
}
