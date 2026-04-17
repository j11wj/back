import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto) {
    // Check if code already exists
    const existing = await this.prisma.coupon.findUnique({
      where: { code: createCouponDto.code },
    });

    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    // Validate dates
    const validFrom = new Date(createCouponDto.validFrom);
    const validUntil = new Date(createCouponDto.validUntil);

    if (validUntil <= validFrom) {
      throw new BadRequestException('Valid until date must be after valid from date');
    }

    // Validate discount value
    if (createCouponDto.discountType === 'PERCENTAGE' && createCouponDto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    return this.prisma.coupon.create({
      data: {
        ...createCouponDto,
        validFrom,
        validUntil,
      },
    });
  }

  async findAll(isActive?: boolean) {
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async findByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    // Check if coupon is still valid
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new BadRequestException('Coupon is not valid at this time');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    await this.findOne(id); // Verify coupon exists

    if (updateCouponDto.code) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: updateCouponDto.code },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    const data: any = { ...updateCouponDto };

    if (updateCouponDto.validFrom) {
      data.validFrom = new Date(updateCouponDto.validFrom);
    }

    if (updateCouponDto.validUntil) {
      data.validUntil = new Date(updateCouponDto.validUntil);
    }

    if (data.validFrom && data.validUntil && data.validUntil <= data.validFrom) {
      throw new BadRequestException('Valid until date must be after valid from date');
    }

    return this.prisma.coupon.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verify coupon exists
    return this.prisma.coupon.delete({
      where: { id },
    });
  }

  async toggleActive(id: string) {
    const coupon = await this.findOne(id);
    
    return this.prisma.coupon.update({
      where: { id },
      data: {
        isActive: !coupon.isActive,
      },
    });
  }

  async applyCoupon(code: string, orderAmount: number) {
    const coupon = await this.findByCode(code);

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of $${coupon.minOrderAmount} required for this coupon`,
      );
    }

    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderAmount * coupon.discountValue) / 100;
      
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
      if (discount > orderAmount) {
        discount = orderAmount;
      }
    }

    return {
      coupon,
      discount,
    };
  }
}

