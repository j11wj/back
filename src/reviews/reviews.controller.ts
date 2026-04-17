import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a review for a delivered order' })
  @ApiResponse({ status: 201, description: 'Review successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input or order not eligible' })
  create(@GetUser() user: any, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'restaurantId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  findAll(@Query('restaurantId') restaurantId?: string) {
    return this.reviewsService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review details' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }
}

