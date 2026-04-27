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
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT غير مضبوط — لن تُرسل إشعارات FCM من السيرفر',
      );
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

  /**
   * إشعار ترويجي / سلايدر — للعملاء الذين وافقوا على «عروض وخصومات» أو بدون تفضيل مُسجّل.
   */
  async notifyCustomersPromo(opts: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<{ sent: number; failed: number; skipped: number }> {
    if (!this.ready) {
      this.logger.warn('إشعار مُرسل — Firebase غير مهيأ (السلايدر يُحفظ دون بث)');
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const users = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        fcmToken: true,
        notificationPreference: {
          select: { promotions: true },
        },
      },
    });

    const tokens: string[] = [];
    let skipped = 0;
    for (const u of users) {
      if (!u.fcmToken || u.fcmToken.length < 10) {
        skipped++;
        continue;
      }
      const pref = u.notificationPreference;
      if (pref && pref.promotions === false) {
        skipped++;
        continue;
      }
      tokens.push(u.fcmToken);
    }

    const unique = [...new Set(tokens)];
    if (unique.length === 0) {
      this.logger.log('لا توكنات FCM للعملاء — لم يُرسل إشعار');
      return { sent: 0, failed: 0, skipped: skipped + users.length - unique.length };
    }

    const data: Record<string, string> = {
      ...(opts.data ?? {}),
    };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) data[k] = String(v);
    }

    const batch = 500;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < unique.length; i += batch) {
      const chunk = unique.slice(i, i + batch);
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title: opts.title, body: opts.body },
        data,
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      });
      sent += res.successCount;
      failed += res.failureCount;
    }
    this.logger.log(`FCM سلايدر: success=${sent} failure=${failed} skipped_no_token=${skipped}`);
    return { sent, failed, skipped };
  }
}
