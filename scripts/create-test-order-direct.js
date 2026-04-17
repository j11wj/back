/**
 * إنشاء طلب تجريبي مباشرة في قاعدة البيانات (بدون API).
 * الاستخدام: node scripts/create-test-order-direct.js
 * بعد التشغيل: افتح تطبيق المطعم وسجّل الدخول restaurant@test.com / 123456
 * وستظهر الطلبات في القائمة (بدون إشعار فوري لأن الطلب لم يُنشأ عبر API).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.user.findUnique({ where: { email: 'customer@test.com' } });
  const restaurant = await prisma.restaurant.findFirst({
    where: { userId: { not: null }, isActive: true },
    include: { menuItems: { where: { isAvailable: true }, take: 3 } },
  });
  if (!customer || !restaurant || restaurant.menuItems.length === 0) {
    console.error('شغّل أولاً: npx ts-node --compiler-options \'{"module":"commonjs"}\' prisma/seed.ts');
    process.exit(1);
  }

  const zone = await prisma.zone.findFirst({ where: { name: 'Zone A' } });
  const [m1, m2] = restaurant.menuItems;
  const subtotal = m1.price * 2 + m2.price * 1;
  const tax = subtotal * 0.1;
  const fare = 5;
  const total = subtotal + tax + fare;

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: restaurant.id,
      zoneId: zone.id,
      pickupLatitude: 24.7136,
      pickupLongitude: 46.6753,
      deliveryLatitude: 24.72,
      deliveryLongitude: 46.68,
      distance: 0.8,
      fare,
      subtotal,
      tax,
      discount: 0,
      total,
      commission: (subtotal * (restaurant.commissionRate || 15)) / 100,
      status: 'PENDING',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      description: 'طلب تجريبي (مباشر من السكربت)',
      items: {
        create: [
          { menuItemId: m1.id, quantity: 2, price: m1.price, notes: null },
          { menuItemId: m2.id, quantity: 1, price: m2.price, notes: null },
        ],
      },
    },
  });

  console.log('تم إنشاء الطلب بنجاح (مباشرة في DB)');
  console.log('Order ID:', order.id);
  console.log('المجموع:', total);
  console.log('\nافتح تطبيق المطعم وسجّل الدخول: restaurant@test.com / 123456');
  console.log('ستجد الطلب في قائمة الطلبات.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
