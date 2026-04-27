import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { FinanceQueryDto } from './dto/finance-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('orders')
  @ApiOperation({
    summary: 'تقرير مالي تفصيلي: كل طلب بإجمالي الفاتورة، العمولة، ونسب الربح',
  })
  @ApiResponse({ status: 200, description: 'Paginated financial rows per order' })
  getOrders(@Query() query: FinanceQueryDto) {
    return this.finance.getOrdersReport(query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'ملخص مالي: إجمالي المبيعات، العمولات، إيراد المنصة (عمولة+ضريبة+توصيل)، ومتوسط نسبة الهامش',
  })
  @ApiResponse({ status: 200, description: 'Aggregated financial summary' })
  getSummary(@Query() query: FinanceQueryDto) {
    return this.finance.getSummary(query);
  }
}
