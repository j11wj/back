import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, description, image, isActive } = createCategoryDto;

    // Check if category with same name exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.category.create({
      data: {
        name,
        description,
        image,
        isActive: isActive ?? true,
      },
      include: {
        restaurants: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            image: true,
            rating: true,
            isOpen: true,
          },
        },
      },
    });
  }

  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            restaurants: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        restaurants: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
            phone: true,
            address: true,
            rating: true,
            isOpen: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: {
            restaurants: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if name is being updated and if it conflicts
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: {
            restaurants: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurants: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has restaurants
    if (category._count.restaurants > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated restaurants. Please remove or reassign restaurants first.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  async toggleActive(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
    });
  }
}

