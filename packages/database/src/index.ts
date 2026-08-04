import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client instance
 */
const prisma = new PrismaClient();

export default prisma;
export * from '@prisma/client';
