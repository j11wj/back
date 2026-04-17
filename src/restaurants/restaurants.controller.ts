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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new restaurant (Admin only)' })
  @ApiResponse({ status: 201, description: 'Restaurant successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all restaurants' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'isOpen', required: false, type: Boolean, description: 'Filter by open status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, description, or address' })
  @ApiResponse({ status: 200, description: 'List of restaurants' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('isOpen') isOpen?: string,
    @Query('search') search?: string,
  ) {
    return this.restaurantsService.findAll(
      categoryId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isOpen === 'true' ? true : isOpen === 'false' ? false : undefined,
      search,
    );
  }

  @Public()
  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get restaurants by category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'List of restaurants in category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.restaurantsService.findByCategory(categoryId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RESTAURANT')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'الملف الشخصي للمطعم (لصاحب المطعم المسجّل دخوله)' })
  @ApiResponse({ status: 200, description: 'Restaurant profile' })
  @ApiResponse({ status: 404, description: 'No restaurant linked to this account' })
  getMyRestaurant(@Req() req: { user: { id: string } }) {
    return this.restaurantsService.findByOwnerId(req.user.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RESTAURANT')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update restaurant (Admin أو صاحب المطعم لمطعمه فقط)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant updated' })
  @ApiResponse({ status: 403, description: 'Not allowed to update this restaurant' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role === 'RESTAURANT') {
      const restaurant = await this.restaurantsService.findOne(id);
      if (restaurant.userId !== req.user.id) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا المطعم');
      }
    }
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete restaurant (Admin only - soft delete)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 204, description: 'Restaurant deleted' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }

  @Patch(':id/toggle-open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RESTAURANT')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'فتح/إغلاق المطعم (Admin أو صاحب المطعم)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant status toggled' })
  @ApiResponse({ status: 403, description: 'Not allowed' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async toggleOpen(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role === 'RESTAURANT') {
      const restaurant = await this.restaurantsService.findOne(id);
      if (restaurant.userId !== req.user.id) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا المطعم');
      }
    }
    return this.restaurantsService.toggleOpen(id);
  }

  @Patch(':id/rating')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update restaurant rating (Admin only)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant rating updated' })
  @ApiResponse({ status: 400, description: 'Invalid rating (must be 0-5)' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  updateRating(
    @Param('id') id: string,
    @Body('rating') rating: number,
  ) {
    return this.restaurantsService.updateRating(id, rating);
  }
}

