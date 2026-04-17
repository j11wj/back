import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(customerId: string, createReviewDto: CreateReviewDto) {
    // Verify order exists and belongs to customer
    const order = await this.prisma.order.findUnique({
      where: { id: createReviewDto.orderId },
      include: {
        restaurant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException('You can only review your own orders');
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('You can only review delivered orders');
    }

    if (!order.restaurantId) {
      throw new BadRequestException('This order does not have a restaurant');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: createReviewDto.orderId },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this order');
    }

    const review = await this.prisma.review.create({
      data: {
        orderId: createReviewDto.orderId,
        restaurantId: order.restaurantId,
        customerId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update restaurant rating
    await this.updateRestaurantRating(order.restaurantId);

    return review;
  }

  async findAll(restaurantId?: string) {
    const where: any = {};
    
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    return this.prisma.review.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private async updateRestaurantRating(restaurantId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { restaurantId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      },
    });
  }
}

