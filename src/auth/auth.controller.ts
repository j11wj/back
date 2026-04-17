import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginDto } from './dto/login.dto';
import { LoginPhoneDto } from './dto/login-phone.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('restaurant/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء حساب مطعم (تسجيل مطعم جديد)' })
  @ApiBody({ type: RegisterRestaurantDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء حساب المطعم بنجاح' })
  @ApiResponse({ status: 409, description: 'البريد الإلكتروني مسجّل مسبقاً' })
  @ApiResponse({ status: 404, description: 'التصنيف غير موجود' })
  async registerRestaurant(@Body() dto: RegisterRestaurantDto) {
    return this.authService.registerRestaurant(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user (تسجيل الدخول - للعملاء والمطاعم والسائقين)' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('login-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل دخول العميل برقم الهاتف والاسم الكامل' })
  @ApiBody({ type: LoginPhoneDto })
  @ApiResponse({ status: 200, description: 'تم تسجيل الدخول أو إنشاء الحساب' })
  @ApiResponse({ status: 401, description: 'الاسم لا يطابق الرقم' })
  async loginPhone(@Body() dto: LoginPhoneDto) {
    return this.authService.loginPhone(dto);
  }
}

