import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** أسعار بالدينار العراقي (رقم فقط في الواجهة). */
const IQD = (n: number) => n;

async function main() {
  console.log('--- بذور جنوب بابل (قاسم / حمزه / الهاشمية) ---\n');

  const zoneDefs = [
    { legacy: 'Zone A', name: 'توصيل قريب — جنوب بابل', minDistance: 0, maxDistance: 3, price: 2000 },
    { legacy: 'Zone B', name: 'توصيل متوسط — جنوب بابل', minDistance: 3, maxDistance: 6, price: 3500 },
    { legacy: 'Zone C', name: 'توصيل أبعد — جنوب بابل', minDistance: 6, maxDistance: 12, price: 5000 },
  ];

  for (const z of zoneDefs) {
    const existing = await prisma.zone.findFirst({
      where: { OR: [{ name: z.legacy }, { name: z.name }] },
    });
    if (existing) {
      await prisma.zone.update({
        where: { id: existing.id },
        data: {
          name: z.name,
          minDistance: z.minDistance,
          maxDistance: z.maxDistance,
          price: z.price,
        },
      });
    } else {
      await prisma.zone.create({
        data: {
          name: z.name,
          minDistance: z.minDistance,
          maxDistance: z.maxDistance,
          price: z.price,
        },
      });
    }
  }
  console.log('Zones updated (جنوب بابل)');

  const pass = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'مدير النظام',
      role: 'ADMIN',
    },
  });

  /** عميل: تسجيل دخول بالهاتف — الاسم + الرقم كما في التطبيق */
  const customerPhone = '07801234567';
  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {
      name: 'زبون جنوب بابل',
      phone: customerPhone,
    },
    create: {
      email: 'customer@test.com',
      password: pass,
      name: 'زبون جنوب بابل',
      phone: customerPhone,
      role: 'CUSTOMER',
    },
  });

  const categories = [
    { name: 'مأكولات عراقية', description: 'كبة، قيمة، أطباق منزلية' },
    { name: 'مشاوي', description: 'لحم، دجاج، كباب' },
    { name: 'وجبات سريعة', description: 'برجر، شاورما، سندويتش' },
    { name: 'عصائر ومشروبات', description: 'عصائر طازجة' },
    { name: 'حلويات', description: 'حلويات شرقية' },
  ];

  const catRows: { id: string; name: string }[] = [];
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description, isActive: true },
      create: { name: c.name, description: c.description, isActive: true },
    });
    catRows.push({ id: row.id, name: row.name });
  }

  type MenuDef = { name: string; description: string; price: number; category: string };

  const restaurants: {
    email: string;
    ownerName: string;
    phone: string;
    restName: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    categoryName: string;
    rating: number;
    menu: MenuDef[];
  }[] = [
    {
      email: 'meshawi.furat@babil.local',
      ownerName: 'أبو حسين — مشاوي الفرات',
      phone: '07801111111',
      restName: 'مشاوي الفرات',
      description: 'مشاوي على الفحم، كباب وكباب تركي، قرب سوق قاسم',
      address: 'محافظة بابل — ناحية قاسم، حي الرحمة، شارع السوق',
      lat: 32.308,
      lng: 44.672,
      categoryName: 'مشاوي',
      rating: 4.6,
      menu: [
        { name: 'كباب لحم', description: '6 أسياخ', price: IQD(12000), category: 'مشاوي' },
        { name: 'تكة لحم', description: 'مع خبز وصلصة', price: IQD(15000), category: 'مشاوي' },
        { name: 'ريش ومشاوي مشكلة', description: 'وجبة عائلية', price: IQD(28000), category: 'مشاوي' },
        { name: 'دجاج مسحب', description: 'نصف دجاجة', price: IQD(11000), category: 'مشاوي' },
        { name: 'أرز أصفر', description: 'وعاء وسط', price: IQD(4000), category: 'مأكولات عراقية' },
        { name: 'سلطة خضراء', description: 'طبق', price: IQD(2500), category: 'مأكولات عراقية' },
        { name: 'مشروب عرقسوس', description: 'كأس كبير', price: IQD(2000), category: 'عصائر ومشروبات' },
      ],
    },
    {
      email: 'dajaj.hamza@babil.local',
      ownerName: 'مطعم دجاج كرسبي حمزه',
      phone: '07802222222',
      restName: 'دجاج كرسبي حمزه',
      description: 'برجر دجاج وكرسبي، وجبات أطفال، قرب جامع حمزه',
      address: 'محافظة بابل — ناحية حمزه، وسط البلد، قرب الجامع الكبير',
      lat: 32.476,
      lng: 44.525,
      categoryName: 'وجبات سريعة',
      rating: 4.3,
      menu: [
        { name: 'وجبة كرسبي كبيرة', description: 'بطاطس ومشروب', price: IQD(8000), category: 'وجبات سريعة' },
        { name: 'برجر دجاج حار', description: 'وجبة', price: IQD(6500), category: 'وجبات سريعة' },
        { name: 'أجنحة دجاج', description: '6 قطع', price: IQD(7000), category: 'وجبات سريعة' },
        { name: 'بطاطس كرسبي', description: 'صندوق وسط', price: IQD(3500), category: 'وجبات سريعة' },
        { name: 'سلطة كول سلو', description: 'صغير', price: IQD(2000), category: 'وجبات سريعة' },
        { name: 'عصير مانجو', description: 'كوب', price: IQD(3000), category: 'عصائر ومشروبات' },
      ],
    },
    {
      email: 'samak.hashimiya@babil.local',
      ownerName: 'مطعم السمك — الهاشمية',
      phone: '07803333333',
      restName: 'سمك وجمبري الهاشمية',
      description: 'سمك مشوي ومقلي، جمبري، كورنيش الهاشمية',
      address: 'محافظة بابل — قضاء الهاشمية، كورنيش الهاشمية',
      lat: 32.015,
      lng: 44.835,
      categoryName: 'مأكولات عراقية',
      rating: 4.5,
      menu: [
        { name: 'سمك زبيدي مشوي', description: 'كيلو', price: IQD(18000), category: 'مأكولات عراقية' },
        { name: 'جمبري مقلي', description: 'نصف كيلو', price: IQD(16000), category: 'مأكولات عراقية' },
        { name: 'تشريب سمك', description: 'طبق', price: IQD(9000), category: 'مأكولات عراقية' },
        { name: 'أرز بالشعيرية', description: 'طبق', price: IQD(3500), category: 'مأكولات عراقية' },
        { name: 'سلطة طحينة', description: 'طبق', price: IQD(2500), category: 'مأكولات عراقية' },
        { name: 'شاي عراقي', description: 'إبريق', price: IQD(1500), category: 'عصائر ومشروبات' },
      ],
    },
    {
      email: 'kubba.qasim@babil.local',
      ownerName: 'كبة وعصيد بابل',
      phone: '07804444444',
      restName: 'كبة السيدة — قاسم',
      description: 'كبة برغل، عصيد، قيمة، طعم بيتي',
      address: 'محافظة بابل — ناحية قاسم، شارع المدارس',
      lat: 32.301,
      lng: 44.685,
      categoryName: 'مأكولات عراقية',
      rating: 4.8,
      menu: [
        { name: 'كبة لحم', description: '12 قطعة', price: IQD(10000), category: 'مأكولات عراقية' },
        { name: 'كبة برغل مشوية', description: '8 قطع', price: IQD(8500), category: 'مأكولات عراقية' },
        { name: 'عصيد دجاج', description: 'طبق', price: IQD(7000), category: 'مأكولات عراقية' },
        { name: 'قيمة', description: 'طبق', price: IQD(6000), category: 'مأكولات عراقية' },
        { name: 'شوربة عدس', description: 'وعاء', price: IQD(3000), category: 'مأكولات عراقية' },
        { name: 'لبن وخيار', description: 'كوب', price: IQD(2000), category: 'عصائر ومشروبات' },
        { name: 'بقلاوة', description: 'ربع كيلو', price: IQD(8000), category: 'حلويات' },
      ],
    },
    {
      email: 'shawarma.south@babil.local',
      ownerName: 'شاورما جنوب بابل',
      phone: '07805555555',
      restName: 'شاورما وبرجر جنوب',
      description: 'شاورما عربي وتركي، فلافل، طريق بغداد حمزه',
      address: 'محافظة بابل — ناحية حمزه، طريق بغداد، مدخل الناحية',
      lat: 32.488,
      lng: 44.508,
      categoryName: 'وجبات سريعة',
      rating: 4.2,
      menu: [
        { name: 'شاورما عربي كبير', description: 'مع بطاطس', price: IQD(5500), category: 'وجبات سريعة' },
        { name: 'شاورما تركي', description: 'وجبة', price: IQD(6000), category: 'وجبات سريعة' },
        { name: 'فلافل ساندويتش', description: '3 قطع', price: IQD(3000), category: 'وجبات سريعة' },
        { name: 'برجر لحم', description: 'وجبة كاملة', price: IQD(7500), category: 'وجبات سريعة' },
        { name: 'مشروب غازي', description: 'علبة', price: IQD(1000), category: 'عصائر ومشروبات' },
        { name: 'عصير ليمون', description: 'كوب', price: IQD(2000), category: 'عصائر ومشروبات' },
      ],
    },
    {
      email: 'asir.hashimiya@babil.local',
      ownerName: 'عصائر الهاشمية',
      phone: '07806666666',
      restName: 'عصائر وآيس كريم الهاشمية',
      description: 'عصائر طازجة، كوكتيلات، آيس كريم',
      address: 'محافظة بابل — الهاشمية، شارع السوق الرئيسي',
      lat: 32.02,
      lng: 44.83,
      categoryName: 'عصائر ومشروبات',
      rating: 4.4,
      menu: [
        { name: 'عصير مانجو طازج', description: 'كوب كبير', price: IQD(4000), category: 'عصائر ومشروبات' },
        { name: 'كوكتيل مشكل', description: 'كوب', price: IQD(4500), category: 'عصائر ومشروبات' },
        { name: 'عصير رمان', description: 'كوب', price: IQD(5000), category: 'عصائر ومشروبات' },
        { name: 'آيس كريم فانيليا', description: 'كأس', price: IQD(3500), category: 'حلويات' },
        { name: 'فواكه موسمية', description: 'طبق', price: IQD(5000), category: 'عصائر ومشروبات' },
      ],
    },
  ];

  const catByName = Object.fromEntries(catRows.map((c) => [c.name, c.id]));

  for (const r of restaurants) {
    const owner = await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.ownerName, phone: r.phone },
      create: {
        email: r.email,
        password: pass,
        name: r.ownerName,
        phone: r.phone,
        role: 'RESTAURANT',
      },
    });

    const catId = catByName[r.categoryName];
    if (!catId) throw new Error('Missing category: ' + r.categoryName);

    const rest = await prisma.restaurant.upsert({
      where: { userId: owner.id },
      update: {
        name: r.restName,
        description: r.description,
        address: r.address,
        latitude: r.lat,
        longitude: r.lng,
        rating: r.rating,
        isActive: true,
        isOpen: true,
        phone: r.phone,
      },
      create: {
        name: r.restName,
        description: r.description,
        address: r.address,
        latitude: r.lat,
        longitude: r.lng,
        rating: r.rating,
        categoryId: catId,
        email: r.email,
        phone: r.phone,
        userId: owner.id,
        isActive: true,
        isOpen: true,
      },
    });

    const menuCount = await prisma.menuItem.count({ where: { restaurantId: rest.id } });
    if (menuCount === 0) {
      await prisma.menuItem.createMany({
        data: r.menu.map((m) => ({
          restaurantId: rest.id,
          name: m.name,
          description: m.description,
          price: m.price,
          category: m.category,
          isAvailable: true,
        })),
      });
    }

    console.log('مطعم:', r.restName, '—', r.address);
  }

  /** مطعم الـ seed القديم (اختياري) */
  const legacy = await prisma.user.findUnique({ where: { email: 'restaurant@test.com' } });
  if (legacy) {
    await prisma.restaurant.updateMany({
      where: { userId: legacy.id },
      data: {
        address: 'محافظة بابل — ناحية حمزه، حي الجمهورية',
        latitude: 32.47,
        longitude: 44.535,
        description: 'مطعم تجريبي — جنوب بابل',
      },
    });
  }

  await prisma.survey.upsert({
    where: { id: 'survey-user-experience-1' },
    update: {
      title: 'تقييم تجربة الطلب',
      description: 'استبيان قصير لتحسين الخدمة',
      isActive: true,
      questionsJson: JSON.stringify([
        { id: 'q1', type: 'rating', label: 'ما تقييمك للتطبيق؟ (1-5)' },
        { id: 'q2', type: 'text', label: 'ما أهم تحسين ترغب به؟' },
      ]),
    },
    create: {
      id: 'survey-user-experience-1',
      title: 'تقييم تجربة الطلب',
      description: 'استبيان قصير لتحسين الخدمة',
      isActive: true,
      questionsJson: JSON.stringify([
        { id: 'q1', type: 'rating', label: 'ما تقييمك للتطبيق؟ (1-5)' },
        { id: 'q2', type: 'text', label: 'ما أهم تحسين ترغب به؟' },
      ]),
    },
  });

  console.log('\n--- تم ---');
  console.log('عميل (هاتف):', customerPhone, '| الاسم: زبون جنوب بابل');
  console.log('مطاعم:', restaurants.length, '+ حساب قديم إن وُجد');
  console.log('الدفع في التطبيق: كاش عند الاستلام فقط');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
