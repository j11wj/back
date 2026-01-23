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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/types/user-role.type';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input or zone not found' })
  create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: any) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (filtered by user role)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@GetUser() user: any) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get available orders for drivers' })
  @ApiResponse({ status: 200, description: 'List of available orders' })
  getAvailableOrders() {
    return this.ordersService.getAvailableOrders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an order (Driver only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order successfully accepted' })
  @ApiResponse({ status: 400, description: 'Order cannot be accepted' })
  acceptOrder(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.acceptOrderByUserId(id, user.id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @GetUser() user: any,
  ) {
    return this.ordersService.updateStatus(
      id,
      updateOrderStatusDto,
      user.id,
      user.role,
    );
  }
}

