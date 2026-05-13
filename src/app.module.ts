import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { ZonesModule } from './zones/zones.module';
import { CategoriesModule } from './categories/categories.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RedisModule } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SurveysModule } from './surveys/surveys.module';
import { PushModule } from './push/push.module';
import { SliderModule } from './slider/slider.module';
import { FinanceModule } from './finance/finance.module';
import { SearchModule } from './search/search.module';
import { UploadModule } from './upload/upload.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    ZonesModule,
    CategoriesModule,
    RestaurantsModule,
    MenuItemsModule,
    CouponsModule,
    ReviewsModule,
    TransactionsModule,
    RealtimeModule,
    AddressesModule,
    PaymentMethodsModule,
    NotificationPreferencesModule,
    FeedbackModule,
    SurveysModule,
    PushModule,
    SliderModule,
    FinanceModule,
    SearchModule,
    UploadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

