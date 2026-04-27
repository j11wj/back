import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { OrderRealtimeService } from '../realtime/services/order-realtime.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderRealtimeService: OrderRealtimeService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'إنشاء طلب (عام — بدون JWT): هاتف + اسم + توكن FCM كما في تسجيل الدخول',
  })
  @ApiResponse({ status: 201, description: 'Order successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input or zone not found' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);

    try {
      await this.orderRealtimeService.notifyOrderCreated(order.id, order);
    } catch (err) {
      if (err?.message) console.error('[OrdersController] notifyOrderCreated:', err.message);
    }

    return order;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all orders (filtered by user role)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@GetUser() user: any) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available orders for drivers' })
  @ApiResponse({ status: 200, description: 'List of available orders' })
  getAvailableOrders(@GetUser() user: any) {
    return this.ordersService.getAvailableOrders(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an order (Driver only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order successfully accepted' })
  @ApiResponse({ status: 400, description: 'Order cannot be accepted' })
  acceptOrder(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.acceptOrderByUserId(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @GetUser() user: any,
  ) {
    const order = await this.ordersService.updateStatus(
      id,
      updateOrderStatusDto,
      user.id,
      user.role,
    );

    await this.orderRealtimeService.emitOrderStatusUpdate(
      order.id,
      order.status,
      order,
    );

    if (order.status === 'DELIVERED' || order.status === 'CANCELED') {
      await this.orderRealtimeService.closeOrderRoom(order.id);
    }

    return order;
  }
}
