import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ZonesModule } from '../zones/zones.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ZonesModule,
    TransactionsModule,
    forwardRef(() => RealtimeModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

