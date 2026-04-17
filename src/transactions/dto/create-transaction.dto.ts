import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionCategory {
  ORDER_COMMISSION = 'ORDER_COMMISSION',
  DELIVERY_FEE = 'DELIVERY_FEE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  OTHER = 'OTHER',
}

export class CreateTransactionDto {
  @ApiPropertyOptional({ description: 'Order ID (if related to an order)' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Restaurant ID (if related to a restaurant)' })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({ description: 'Transaction type', enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Transaction category', enum: TransactionCategory })
  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Transaction status', default: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;
}

