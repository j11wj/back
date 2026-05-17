import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginDto } from './dto/login.dto';
import {
  canonicalizeIraqMobileForStorage,
  iraqMobileLookupCandidates,
  normalizePhoneDigits,
} from '../common/utils/phone-digits';
import { LoginPhoneDto } from './dto/login-phone.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, phone, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const finalRole = role || 'CUSTOMER';

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: finalRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Auto-create Driver record for DRIVER role
    let driver: any = null;
    if (finalRole === 'DRIVER') {
      // Assign default zone (first zone in DB)
      const defaultZone = await this.prisma.zone.findFirst({ orderBy: { createdAt: 'asc' } });
      driver = await this.prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: 'PENDING',
          vehicleType: 'motorcycle',
          isAvailable: true,
          zoneId: defaultZone?.id ?? null,
        },
        select: {
          id: true,
          zoneId: true,
          isAvailable: true,
          vehicleType: true,
        },
      });
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      driver,
      access_token: token,
    };
  }

  async registerRestaurant(dto: RegisterRestaurantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مسجّل مسبقاً');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: 'RESTAURANT',
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      let resolvedZoneId = dto.zoneId;
      if (!resolvedZoneId) {
        const zoneForPool = await tx.zone.findFirst({ orderBy: { minDistance: 'asc' } });
        resolvedZoneId = zoneForPool?.id;
      }

      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName,
          description: dto.description,
          image: dto.image,
          phone: dto.restaurantPhone ?? dto.phone,
          email: dto.email,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          categoryId: dto.categoryId,
          isActive: dto.isActive ?? true,
          isOpen: dto.isOpen ?? true,
          hasPromocode: dto.hasPromocode ?? false,
          commissionRate: dto.commissionRate ?? 15,
          userId: user.id,
          zoneId: resolvedZoneId,
        },
        include: {
          category: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      return { user, restaurant };
    });

    const token = this.generateToken(
      result.user.id,
      result.user.email,
      'RESTAURANT',
    );

    return {
      user: result.user,
      restaurant: result.restaurant,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    const response: any = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      access_token: token,
    };

    if (user.role === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId: user.id },
        include: {
          category: {
            select: { id: true, name: true, image: true },
          },
        },
      });
      if (restaurant) {
        response.restaurant = restaurant;
      }
    }

    if (user.role === 'DRIVER') {
      let driver = await this.prisma.driver.findUnique({
        where: { userId: user.id },
        select: { id: true, zoneId: true, isAvailable: true, vehicleType: true },
      });
      // Auto-create Driver record if missing (legacy accounts)
      if (!driver) {
        const defaultZone = await this.prisma.zone.findFirst({ orderBy: { createdAt: 'asc' } });
        driver = await this.prisma.driver.create({
          data: {
            userId: user.id,
            licenseNumber: 'PENDING',
            vehicleType: 'motorcycle',
            isAvailable: true,
            zoneId: defaultZone?.id ?? null,
          },
          select: { id: true, zoneId: true, isAvailable: true, vehicleType: true },
        });
      }
      response.driver = driver;
    }

    return response;
  }

  /**
   * تسجيل دخول العميل برقم الهاتف + الاسم الكامل فقط.
   * إذا لم يكن الرقم مسجّلاً يُنشأ حساب عميل جديد.
   */
  async loginPhone(dto: LoginPhoneDto) {
    const phone = this.normalizePhone(dto.phone);
    const name = dto.name.trim().replace(/\s+/g, ' ');
    if (phone.length < 8) {
      throw new BadRequestException('رقم الهاتف غير صالح');
    }
    if (name.length < 2) {
      throw new BadRequestException('يرجى إدخال الاسم الكامل');
    }

    const phoneKeys = iraqMobileLookupCandidates(phone);
    const phoneStored = canonicalizeIraqMobileForStorage(phone);

    let user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneKeys } },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const syntheticEmail = `phone_${phoneStored}@meez.local`;
      try {
        user = await this.prisma.user.create({
          data: {
            email: syntheticEmail,
            password: hashedPassword,
            name,
            phone: phoneStored,
            role: 'CUSTOMER',
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          throw new ConflictException('رقم الهاتف أو البريد مستخدم مسبقاً');
        }
        throw e;
      }
    } else {
      if (user.role !== 'CUSTOMER') {
        throw new UnauthorizedException(
          'هذا الحساب مسجّل كمطعم أو سائق. استخدم طريقة الدخول المناسبة.',
        );
      }
      const existingName = user.name.trim().replace(/\s+/g, ' ');
      if (existingName !== name) {
        throw new UnauthorizedException('الاسم لا يطابق الرقم المسجّل');
      }
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      access_token: token,
    };
  }

  /**
   * للطلب بدون JWT: نفس تحقق login-phone + حفظ توكن FCM على المستخدم.
   */
  async ensureCustomerForOrder(phoneRaw: string, nameRaw: string, fcmTokenRaw: string) {
    const phone = this.normalizePhone(phoneRaw);
    const name = nameRaw.trim().replace(/\s+/g, ' ');
    if (phone.length < 8) {
      throw new BadRequestException('رقم الهاتف غير صالح');
    }
    if (name.length < 2) {
      throw new BadRequestException('يرجى إدخال الاسم الكامل');
    }
    const tok = fcmTokenRaw.trim();
    if (tok.length < 10) {
      throw new BadRequestException('توكن الجهاز (FCM) غير صالح');
    }

    const phoneKeys = iraqMobileLookupCandidates(phone);
    const phoneStored = canonicalizeIraqMobileForStorage(phone);

    let user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneKeys } },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const syntheticEmail = `phone_${phoneStored}@meez.local`;
      try {
        user = await this.prisma.user.create({
          data: {
            email: syntheticEmail,
            password: hashedPassword,
            name,
            phone: phoneStored,
            role: 'CUSTOMER',
            fcmToken: tok,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          throw new ConflictException('رقم الهاتف أو البريد مستخدم مسبقاً');
        }
        throw e;
      }
    } else {
      if (user.role !== 'CUSTOMER') {
        throw new UnauthorizedException(
          'هذا الحساب مسجّل كمطعم أو سائق. استخدم طريقة الدخول المناسبة.',
        );
      }
      const existingName = user.name.trim().replace(/\s+/g, ' ');
      if (existingName !== name) {
        throw new UnauthorizedException('الاسم لا يطابق الرقم المسجّل');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { fcmToken: tok },
      });
      user = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    }

    return user;
  }

  private normalizePhone(raw: string): string {
    return normalizePhoneDigits(raw);
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    if (role === 'ADMIN') {
      return this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
      });
    }
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return user;
  }
}

