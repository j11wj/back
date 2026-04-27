/**
 * إنشاء طلب تجريبي للمطعم (يُشغّل مع الباك اند قيد التشغيل)
 * الاستخدام: node scripts/create-test-order.js
 * تأكد من تشغيل npm run prisma:seed أولاً ثم npm start
 *
 * إذا ظهر خطأ 500: تأكد من إعادة تشغيل الباك اند (npm run build && npm start)
 * وافتح الطلبات من تطبيق المطعم بعد تسجيل الدخول: restaurant@test.com / 123456
 */
const API = process.env.API_URL || 'http://localhost:3000';

/** POST /orders عام (بدون JWT) — يتطلب customerPhone + customerName + fcmToken */
async function createOrder(body) {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create order failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: { not: null }, isActive: true },
      include: {
        menuItems: { where: { isAvailable: true }, take: 3 },
      },
    });
    if (!restaurant || restaurant.menuItems.length === 0) {
      console.error('لم يتم العثور على مطعم له أصناف. شغّل: npm run prisma:seed');
      process.exit(1);
    }

    const [item1, item2] = restaurant.menuItems;
    console.log('المطعم:', restaurant.name, '| أصناف:', restaurant.menuItems.map((m) => m.name).join(', '));

    const orderBody = {
      customerPhone: '07801234567',
      customerName: 'زبون جنوب بابل',
      fcmToken: 'script-test-fcm-token-placeholder-min-length-ok',
      pickupLatitude: restaurant.latitude ?? 32.3,
      pickupLongitude: restaurant.longitude ?? 44.68,
      deliveryLatitude: (restaurant.latitude ?? 32.3) + 0.004,
      deliveryLongitude: (restaurant.longitude ?? 44.68) + 0.003,
      restaurantId: restaurant.id,
      items: [
        { menuItemId: item1.id, quantity: 2 },
        { menuItemId: item2.id, quantity: 1 },
      ],
      description: 'طلب تجريبي من السكربت (بدون JWT)',
      paymentMethod: 'CASH',
    };

    const order = await createOrder(orderBody);
    console.log('تم إنشاء الطلب بنجاح');
    console.log('Order ID:', order.id);
    console.log('المجموع:', order.total);
    console.log('\nيفترض أن يصل الطلب الآن لتطبيق المطعم (Socket) ويُطبع الوصل إن ضُبطت الطابعة.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
