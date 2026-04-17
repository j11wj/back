/**
 * إنشاء طلب تجريبي للمطعم (يُشغّل مع الباك اند قيد التشغيل)
 * الاستخدام: node scripts/create-test-order.js
 * تأكد من تشغيل npm run prisma:seed أولاً ثم npm start
 *
 * إذا ظهر خطأ 500: تأكد من إعادة تشغيل الباك اند (npm run build && npm start)
 * وافتح الطلبات من تطبيق المطعم بعد تسجيل الدخول: restaurant@test.com / 123456
 */
const API = process.env.API_URL || 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function createOrder(token, body) {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

    const token = await login('customer@test.com', '123456');
    console.log('تم تسجيل دخول العميل');

    const orderBody = {
      pickupLatitude: restaurant.latitude ?? 24.7136,
      pickupLongitude: restaurant.longitude ?? 46.6753,
      deliveryLatitude: 24.72,
      deliveryLongitude: 46.68,
      restaurantId: restaurant.id,
      items: [
        { menuItemId: item1.id, quantity: 2 },
        { menuItemId: item2.id, quantity: 1 },
      ],
      description: 'طلب تجريبي من السكربت',
      paymentMethod: 'CASH',
    };

    const order = await createOrder(token, orderBody);
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
