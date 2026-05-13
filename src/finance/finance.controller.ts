import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'تقرير مالي تفصيلي لكل طلب مع الأصناف والعمولة' })
  @ApiResponse({ status: 200 })
  getOrders(@Query() query: FinanceQueryDto) {
    return this.finance.getOrdersReport(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'ملخص مالي مجمّع (إجماليات)' })
  @ApiResponse({ status: 200 })
  getSummary(@Query() query: FinanceQueryDto) {
    return this.finance.getSummary(query);
  }

  @Get('restaurant/:id/invoice')
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'فاتورة مطعم: كل الطلبات والأصناف والعمولة' })
  getRestaurantInvoice(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.getRestaurantInvoice(id, from, to);
  }

  @Get('driver/:userId/invoice')
  @ApiParam({ name: 'userId', description: 'User ID of the driver' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'فاتورة سائق: كل التوصيلات والمسافات والرسوم' })
  getDriverInvoice(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.getDriverInvoice(userId, from, to);
  }
}
