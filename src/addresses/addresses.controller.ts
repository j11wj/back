import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('addresses')
@ApiBearerAuth('JWT-auth')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة العناوين المحفوظة للمستخدم الحالي' })
  @ApiResponse({ status: 200 })
  findAll(@GetUser() user: { id: string }) {
    return this.addressesService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'إضافة عنوان' })
  @ApiResponse({ status: 201 })
  create(@GetUser() user: { id: string }, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل عنوان' })
  update(
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف عنوان' })
  @ApiResponse({ status: 200 })
  remove(@GetUser() user: { id: string }, @Param('id') id: string) {
    return this.addressesService.remove(user.id, id);
  }
}
