import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('menu-items')
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new menu item (Admin only)' })
  @ApiResponse({ status: 201, description: 'Menu item successfully created' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all menu items' })
  @ApiQuery({ name: 'restaurantId', required: false, type: String })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of menu items' })
  findAll(
    @Query('restaurantId') restaurantId?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.menuItemsService.findAll(
      restaurantId,
      isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item details' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update menu item (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item updated' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  update(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, updateMenuItemDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete menu item (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 204, description: 'Menu item deleted' })
  @ApiResponse({ status: 400, description: 'Menu item has been ordered' })
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id);
  }

  @Patch(':id/toggle-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle menu item availability (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu item ID' })
  @ApiResponse({ status: 200, description: 'Menu item availability toggled' })
  toggleAvailability(@Param('id') id: string) {
    return this.menuItemsService.toggleAvailability(id);
  }
}

