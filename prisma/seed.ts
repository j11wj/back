import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding zones...');

  // Create zones
  const zoneA = await prisma.zone.upsert({
    where: { name: 'Zone A' },
    update: {},
    create: {
      name: 'Zone A',
      minDistance: 0,
      maxDistance: 3,
      price: 5.0,
    },
  });

  const zoneB = await prisma.zone.upsert({
    where: { name: 'Zone B' },
    update: {},
    create: {
      name: 'Zone B',
      minDistance: 3,
      maxDistance: 6,
      price: 10.0,
    },
  });

  const zoneC = await prisma.zone.upsert({
    where: { name: 'Zone C' },
    update: {},
    create: {
      name: 'Zone C',
      minDistance: 6,
      maxDistance: 10,
      price: 15.0,
    },
  });

  console.log('Zones seeded:', { zoneA, zoneB, zoneC });

  // Create a default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', { email: admin.email, name: admin.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

