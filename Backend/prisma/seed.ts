import { PrismaClient, Role, CustomerType, CustomerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const hashedPassword = await bcrypt.hash('Password123', 10);

  // Seed Users
  const usersData = [
    { name: 'Admin User', email: 'admin@minierp.com', role: Role.ADMIN },
    { name: 'Sales Representative', email: 'sales@minierp.com', role: Role.SALES },
    { name: 'Warehouse Manager', email: 'warehouse@minierp.com', role: Role.WAREHOUSE },
    { name: 'Accounts Officer', email: 'accounts@minierp.com', role: Role.ACCOUNTS },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashedPassword, role: u.role, name: u.name },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
      },
    });
  }
  console.log('Seeded 4 Role Users');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
