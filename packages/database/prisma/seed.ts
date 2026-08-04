import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Electronics',
  'Food & Beverage',
  'Clothing & Apparel',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Automotive',
  'Office Supplies',
  'Toys & Games',
  'Pet Supplies',
];

/**
 * Seeds default categories into the database
 */
async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.create({
      data: { name },
    });
  }
  console.log('Categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
