/**
 * إنشاء طلب تجريبي مباشرة في قاعدة البيانات (بدون API).
 * يستهدف مطعم «كبة السيدة — قاسم» ونفس منطقة السائق driver@test.com (بعد prisma:seed).
 *
 * الاستخدام: node scripts/create-test-order-direct.js
 *
 * بعد التشغيل:
 * - المطعم: kubba.qasim@babil.local / 123456 — يرى الطلب في قائمة الطلبات (نفس المنطقة).
 * - السائق: driver@test.com / 123456 — GET /orders/available أو تطبيق السائق.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KOBA_RESTAURANT_EMAIL = 'kubba.qasim@babil.local';

async function main() {
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@test.com' },
  });
  const restaurant = await prisma.restaurant.findFirst({
    where: { email: KOBA_RESTAURANT_EMAIL, isActive: true },
    include: {
      menuItems: { where: { isAvailable: true }, take: 3 },
      zone: true,
    },
  });

  if (!customer || !restaurant || restaurant.menuItems.length < 2) {
    console.error(
      'تأكد من تشغيل البذور أولاً: npm run prisma:seed\n' +
        '(يحتاج عميل customer@test.com ومطعم كبة السيدة مع أصناف)',
    );
    process.exit(1);
  }

  const zoneId = restaurant.zoneId;
  if (!zoneId) {
    console.error('المطعم بدون zoneId — شغّل npm run prisma:seed');
    process.exit(1);
  }

  /** مطابق لـ orders.service: منطقة العرض للسائقين والمطاعم */
  const poolZoneId = restaurant.zoneId;

  const pickupLat = restaurant.latitude ?? 32.301;
  const pickupLng = restaurant.longitude ?? 44.685;
  const deliveryLat = pickupLat + 0.004;
  const deliveryLng = pickupLng + 0.003;

  const [m1, m2] = restaurant.menuItems;
  const subtotal = m1.price * 2 + m2.price * 1;
  const tax = subtotal * 0.1;
  const fare =
    restaurant.zone?.price != null ? Number(restaurant.zone.price) : 2000;
  const total = subtotal + tax - 0 + fare;
  const commission =
    (subtotal * (restaurant.commissionRate ?? 15)) / 100;

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: restaurant.id,
      zoneId,
      poolZoneId,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      deliveryLatitude: deliveryLat,
      deliveryLongitude: deliveryLng,
      distance: 0.8,
      fare,
      subtotal,
      tax,
      discount: 0,
      total,
      commission,
      status: 'PENDING',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      description: 'طلب تجريبي (سكربت) — كبة السيدة + نفس منطقة السائق',
      items: {
        create: [
          { menuItemId: m1.id, quantity: 2, price: m1.price, notes: null },
          { menuItemId: m2.id, quantity: 1, price: m2.price, notes: null },
        ],
      },
    },
  });

  console.log('تم إنشاء الطلب في DB');
  console.log('Order ID:', order.id);
  console.log('المطعم:', restaurant.name);
  console.log('poolZoneId / zoneId:', poolZoneId, '(نفس منطقة السائق driver@test.com بعد الـ seed)');
  console.log('المجموع التقريبي:', Math.round(total));
  console.log('\n--- من يراه ---');
  console.log('مطعم:', KOBA_RESTAURANT_EMAIL, '/ 123456');
  console.log('سائق:  driver@test.com / 123456  →  GET /orders/available');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
