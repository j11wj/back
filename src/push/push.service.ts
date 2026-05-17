import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private ready = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!raw?.trim()) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT غير مضبوط — لن تُرسل إشعارات FCM من السيرفر');
      return;
    }
    try {
      const cred = JSON.parse(raw) as admin.ServiceAccount;
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(cred) });
      }
      this.ready = true;
      this.logger.log('تم تهيئة Firebase Admin (FCM)');
    } catch (e) {
      this.logger.error('فشل تحليل FIREBASE_SERVICE_ACCOUNT / تهيئة Firebase', e);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /** إرسال إشعار لجهاز واحد عبر FCM token */
  async sendToToken(
    token: string,
    opts: { title: string; body: string; data?: Record<string, string> },
  ): Promise<boolean> {
    if (!this.ready || !token || token.length < 10) return false;
    try {
      await admin.messaging().send({
        token,
        notification: { title: opts.title, body: opts.body },
        data: opts.data ?? {},
        android: { priority: 'high', notification: { sound: 'default', channelId: 'new_orders' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      return true;
    } catch (e: any) {
      this.logger.warn(`sendToToken failed: ${e?.message}`);
      return false;
    }
  }

  /** إرسال إشعار طلب جديد لصاحب المطعم عبر userId */
  async notifyRestaurantNewOrder(restaurantUserId: string, opts: {
    orderId: string;
    customerName: string;
    total: number;
  }): Promise<void> {
    if (!this.ready) return;
    const user = await this.prisma.user.findUnique({
      where: { id: restaurantUserId },
      select: { fcmToken: true },
    });
    if (!user?.fcmToken) return;

    await this.sendToToken(user.fcmToken, {
      title: 'طلب جديد',
      body: `${opts.customerName} — ${Math.round(opts.total).toLocaleString()} IQD`,
      data: {
        type: 'new_order',
        orderId: opts.orderId,
        customerName: opts.customerName,
        total: String(opts.total),
      },
    });

    this.logger.log(`FCM → restaurant user ${restaurantUserId} (order ${opts.orderId})`);
  }

  /** إرسال إشعار تحديث حالة الطلب للزبون */
  async notifyCustomerOrderStatus(customerId: string, opts: {
    orderId: string;
    status: string;
  }): Promise<void> {
    if (!this.ready) return;
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { fcmToken: true },
    });
    if (!user?.fcmToken) return;

    const statusLabel: Record<string, string> = {
      ACCEPTED: 'تم قبول طلبك',
      ON_THE_WAY: 'طلبك في الطريق إليك',
      DELIVERED: 'تم توصيل طلبك',
      CANCELED: 'تم إلغاء طلبك',
    };

    const body = statusLabel[opts.status];
    if (!body) return;

    await this.sendToToken(user.fcmToken, {
      title: 'تحديث الطلب',
      body,
      data: { type: 'order_status', orderId: opts.orderId, status: opts.status },
    });

    this.logger.log(`FCM → customer ${customerId} status=${opts.status}`);
  }

  /**
   * إرسال FCM لجميع سائقي زون معين.
   * إذا لم يوجد سائق في الزون، يُبحث عن أقرب زون يحتوي سائقين متاحين.
   */
  async notifyDriversNewOrder(opts: {
    orderId: string;
    poolZoneId: string | null;
    pickupLat: number;
    pickupLng: number;
    restaurantName: string;
    fare: number;
  }): Promise<void> {
    if (!this.ready) return;

    const { orderId, poolZoneId, restaurantName, fare } = opts;

    let tokens: string[] = [];

    // 1. Try drivers in same zone
    if (poolZoneId) {
      const driversInZone = await this.prisma.driver.findMany({
        where: { zoneId: poolZoneId, isAvailable: true },
        select: { user: { select: { fcmToken: true } } },
      });
      tokens = driversInZone
        .map((d) => d.user?.fcmToken)
        .filter((t): t is string => !!t && t.length > 10);
    }

    // 2. Fallback: find drivers in nearest zones if none found
    if (tokens.length === 0) {
      this.logger.warn(
        `No drivers with FCM in zone ${poolZoneId} — broadcasting to all available drivers`,
      );
      const allDrivers = await this.prisma.driver.findMany({
        where: { isAvailable: true },
        select: { user: { select: { fcmToken: true } } },
      });
      tokens = allDrivers
        .map((d) => d.user?.fcmToken)
        .filter((t): t is string => !!t && t.length > 10);
    }

    const unique = [...new Set(tokens)];
    if (unique.length === 0) {
      this.logger.warn(`No driver FCM tokens found for order ${orderId}`);
      return;
    }

    const fareStr = Math.round(fare).toLocaleString('ar-IQ');
    for (let i = 0; i < unique.length; i += 500) {
      await admin.messaging().sendEachForMulticast({
        tokens: unique.slice(i, i + 500),
        notification: {
          title: 'طلب جديد 🛵',
          body: `${restaurantName} — ${fareStr} IQD`,
        },
        data: {
          type: 'new_order',
          orderId,
          restaurantName,
          fare: String(fare),
        },
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'new_orders' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    }

    this.logger.log(
      `FCM new_order → ${unique.length} driver(s) for order ${orderId}`,
    );
  }

  /** إشعار ترويجي للعملاء */
  async notifyCustomersPromo(opts: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<{ sent: number; failed: number; skipped: number }> {
    if (!this.ready) return { sent: 0, failed: 0, skipped: 0 };

    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { fcmToken: true, notificationPreference: { select: { promotions: true } } },
    });

    const tokens: string[] = [];
    let skipped = 0;
    for (const u of users) {
      if (!u.fcmToken || u.fcmToken.length < 10) { skipped++; continue; }
      if (u.notificationPreference?.promotions === false) { skipped++; continue; }
      tokens.push(u.fcmToken);
    }

    const unique = [...new Set(tokens)];
    if (unique.length === 0) return { sent: 0, failed: 0, skipped };

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.data ?? {})) {
      if (v !== undefined) data[k] = String(v);
    }

    let sent = 0, failed = 0;
    for (let i = 0; i < unique.length; i += 500) {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: unique.slice(i, i + 500),
        notification: { title: opts.title, body: opts.body },
        data,
        apns: { payload: { aps: { sound: 'default' } } },
      });
      sent += res.successCount;
      failed += res.failureCount;
    }
    this.logger.log(`FCM promo: sent=${sent} failed=${failed} skipped=${skipped}`);
    return { sent, failed, skipped };
  }
}
