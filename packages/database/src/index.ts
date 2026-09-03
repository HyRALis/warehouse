import path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

loadEnvironment({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const positiveInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export interface PrismaConnectionOptions {
    databaseUrl?: string;
    maxConnections?: number;
    connectionTimeoutMs?: number;
    idleTimeoutMs?: number;
}

export const createPrismaClient = (options: PrismaConnectionOptions = {}): PrismaClient => {
    const connectionString = options.databaseUrl ?? process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required to create the Prisma Client');
    }

    const adapter = new PrismaPg({
        connectionString,
        max:
            options.maxConnections ??
            positiveInteger(process.env.PRISMA_POOL_MAX_CONNECTIONS, 10),
        connectionTimeoutMillis:
            options.connectionTimeoutMs ??
            positiveInteger(process.env.PRISMA_POOL_CONNECTION_TIMEOUT_MS, 5_000),
        idleTimeoutMillis:
            options.idleTimeoutMs ??
            positiveInteger(process.env.PRISMA_POOL_IDLE_TIMEOUT_MS, 30_000),
    });

    return new PrismaClient({ adapter });
};

/**
 * One shared Prisma Client and PostgreSQL pool per application process.
 */
const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalDatabase.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalDatabase.prisma = prisma;

export const disconnectDatabase = async (): Promise<void> => {
    await prisma.$disconnect();
};

export default prisma;
export * from './generated/prisma/client.js';
export * from './generated/prisma/enums.js';
