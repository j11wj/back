import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async create(createRestaurantDto: CreateRestaurantDto) {
    const {
      name,
      description,
      image,
      phone,
      email,
      address,
      latitude,
      longitude,
      categoryId,
      zoneId,
      isActive,
      isOpen,
      commissionRate,
    } = createRestaurantDto;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
      });
      if (!zone) {
        throw new NotFoundException(`Zone with ID ${zoneId} not found`);
      }
    }

    return this.prisma.restaurant.create({
      data: {
        name,
        description,
        image,
        phone,
        email,
        address,
        latitude,
        longitude,
        categoryId,
        zoneId,
        isActive: isActive ?? true,
        isOpen: isOpen ?? true,
        commissionRate: commissionRate ?? 15,
        rating: 0,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  }

  async findAll(
    categoryId?: string,
    isActive?: boolean,
    isOpen?: boolean,
    search?: string,
  ) {
    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    } else {
      where.isActive = true; // Default to active only
    }

    if (isOpen !== undefined) {
      where.isOpen = isOpen;
    }

    if (search) {
      // SQLite: avoid mode: 'insensitive' (not supported); contains uses LIKE
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { address: { contains: search } },
      ];
    }

    return this.prisma.restaurant.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return restaurant;
  }

  async findByOwnerId(userId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
            menuItems: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('لم يتم العثور على مطعم مرتبط بهذا الحساب');
    }

    return restaurant;
  }

  async update(id: string, updateRestaurantDto: UpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    // If categoryId is being updated, verify it exists
    if (updateRestaurantDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateRestaurantDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateRestaurantDto.categoryId} not found`,
        );
      }
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: updateRestaurantDto,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    // Soft delete: set isActive to false instead of deleting
    return this.prisma.restaurant.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async toggleOpen(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        isOpen: !restaurant.isOpen,
      },
    });
  }

  async updateRating(id: string, rating: number) {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        rating,
      },
    });
  }

  async findByCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.prisma.restaurant.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { name: 'asc' },
      ],
    });
  }
}

