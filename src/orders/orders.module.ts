import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [ZonesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

