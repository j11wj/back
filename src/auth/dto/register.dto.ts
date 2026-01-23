import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { UserRole } from '../../common/types/user-role.type';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+1234567890', description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'CUSTOMER', enum: ['CUSTOMER', 'DRIVER', 'ADMIN'], description: 'User role', required: false })
  @IsOptional()
  @IsIn(['CUSTOMER', 'DRIVER', 'ADMIN'])
  role?: UserRole;
}

