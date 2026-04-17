import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { DriverLocationService } from './services/driver-location.service';
import { OrderRealtimeService } from './services/order-realtime.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    AuthModule,
    forwardRef(() => OrdersModule),
  ],
  providers: [RealtimeGateway, DriverLocationService, OrderRealtimeService],
  exports: [DriverLocationService, OrderRealtimeService],
})
export class RealtimeModule {}

