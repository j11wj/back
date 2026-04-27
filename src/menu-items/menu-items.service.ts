import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuOptionRowDto } from './dto/menu-option-row.dto';

type MenuItemRow = {
  suggestedSauces: string | null;
  suggestedAddons: string | null;
  [key: string]: unknown;
};

@Injectable()
export class MenuItemsService {
  constructor(private prisma: PrismaService) {}

  private parseJsonOptionList(raw: string | null): { name: string; price: number }[] {
    if (raw == null || raw === '') return [];
    try {
      const v = JSON.parse(raw) as unknown;
      if (!Array.isArray(v)) return [];
      return v
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          name: String((x as { name?: unknown }).name ?? ''),
          price: Number((x as { price?: unknown }).price ?? 0),
        }))
        .filter((x) => x.name.length > 0);
    } catch {
      return [];
    }
  }

  private mapMenuItemResponse<T extends MenuItemRow>(row: T): T {
    return {
      ...row,
      suggestedSauces: this.parseJsonOptionList(row.suggestedSauces) as unknown as string | null,
      suggestedAddons: this.parseJsonOptionList(row.suggestedAddons) as unknown as string | null,
    } as T;
  }

  private encodeOptions(
    sauces?: MenuOptionRowDto[],
    addons?: MenuOptionRowDto[],
  ): { suggestedSauces?: string; suggestedAddons?: string } {
    const out: { suggestedSauces?: string; suggestedAddons?: string } = {};
    if (sauces !== undefined) out.suggestedSauces = JSON.stringify(sauces);
    if (addons !== undefined) out.suggestedAddons = JSON.stringify(addons);
    return out;
  }

  async create(createMenuItemDto: CreateMenuItemDto) {
    // Verify restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: createMenuItemDto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const { suggestedSauces, suggestedAddons, ...rest } = createMenuItemDto;
    const created = await this.prisma.menuItem.create({
      data: {
        ...rest,
        ...this.encodeOptions(suggestedSauces, suggestedAddons),
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return this.mapMenuItemResponse(created as MenuItemRow);
  }

  async findAll(restaurantId?: string, isAvailable?: boolean) {
    const where: any = {};
    
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    const rows = await this.prisma.menuItem.findMany({
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
    return rows.map((r) => this.mapMenuItemResponse(r as MenuItemRow));
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

    return this.mapMenuItemResponse(item as MenuItemRow);
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

    const { suggestedSauces, suggestedAddons, ...rest } = updateMenuItemDto;
    const data: Record<string, unknown> = { ...rest };
    if (suggestedSauces !== undefined) {
      data.suggestedSauces = JSON.stringify(suggestedSauces);
    }
    if (suggestedAddons !== undefined) {
      data.suggestedAddons = JSON.stringify(suggestedAddons);
    }
    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: data as never,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return this.mapMenuItemResponse(updated as MenuItemRow);
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
    
    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: !item.isAvailable,
      },
    });
    return this.mapMenuItemResponse(updated as MenuItemRow);
  }
}

