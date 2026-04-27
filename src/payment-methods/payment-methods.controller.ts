import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@ApiTags('payment-methods')
@ApiBearerAuth('JWT-auth')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'بطاقات الدفع المحفوظة (معلومات مقنّعة)' })
  findAll(@GetUser() user: { id: string }) {
    return this.paymentMethodsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'إضافة بطاقة (آخر 4 أرقام فقط)' })
  create(@GetUser() user: { id: string }, @Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل بطاقة محفوظة' })
  update(
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف بطاقة محفوظة' })
  remove(@GetUser() user: { id: string }, @Param('id') id: string) {
    return this.paymentMethodsService.remove(user.id, id);
  }
}
