import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createMenuItemDto: CreateMenuItemDto) {
    // Verify restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: createMenuItemDto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.menuItem.create({
      data: createMenuItemDto,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(restaurantId?: string, isAvailable?: boolean) {
    const where: any = {};
    
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    return this.prisma.menuItem.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto) {
    await this.findOne(id); // Verify item exists

    if (updateMenuItemDto.restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: updateMenuItemDto.restaurantId },
      });

      if (!restaurant) {
        throw new NotFoundException('Restaurant not found');
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: updateMenuItemDto,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verify item exists

    // Check if item is in any orders
    const orderItems = await this.prisma.orderItem.findMany({
      where: { menuItemId: id },
    });

    if (orderItems.length > 0) {
      throw new BadRequestException('Cannot delete menu item that has been ordered');
    }

    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  async toggleAvailability(id: string) {
    const item = await this.findOne(id);
    
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: !item.isAvailable,
      },
    });
  }
}

