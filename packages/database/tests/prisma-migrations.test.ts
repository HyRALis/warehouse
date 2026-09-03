import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import test from 'node:test';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createPrismaClient, ProductStatus } from '../src/index.js';

const execFileAsync = promisify(execFile);
const databaseRoot = path.resolve(import.meta.dirname, '..');
const prismaConfig = path.resolve(databaseRoot, '../../prisma.config.ts');
const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');

const runPrisma = async (databaseUrl: string, ...args: string[]): Promise<void> => {
    await execFileAsync(process.execPath, [prismaCli, ...args, '--config', prismaConfig], {
        cwd: databaseRoot,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        timeout: 120_000,
        windowsHide: true,
    });
};

const integrationTest = ['true', 'local'].includes(process.env.RUN_DATABASE_INTEGRATION ?? '')
    ? test
    : test.skip;

interface TestDatabase {
    url: string;
    stop: () => Promise<void>;
}

const startTestDatabase = async (): Promise<TestDatabase> => {
    if (process.env.RUN_DATABASE_INTEGRATION !== 'local') {
        const container = await new PostgreSqlContainer('postgres:16-alpine')
            .withDatabase('inventory')
            .withUsername('inventory')
            .withPassword('inventory')
            .start();
        return {
            url: container.getConnectionUri(),
            stop: () => container.stop().then(() => undefined),
        };
    }

    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error('DATABASE_URL is required for local integration testing');

    const databaseName = `prisma7_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = '/postgres';
    adminUrl.searchParams.delete('schema');
    const admin = createPrismaClient({ databaseUrl: adminUrl.toString(), maxConnections: 1 });
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);

    const isolatedUrl = new URL(baseUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    isolatedUrl.searchParams.set('schema', 'public');
    return {
        url: isolatedUrl.toString(),
        stop: async () => {
            await admin.$executeRawUnsafe(
                `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
            );
            await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
            await admin.$disconnect();
        },
    };
};

integrationTest(
    'Prisma 7 migrates a clean database and preserves current vendor data',
    { timeout: 180_000 },
    async (context) => {
        const database = await startTestDatabase();
        let prisma: ReturnType<typeof createPrismaClient> | undefined;
        context.after(async () => {
            await prisma?.$disconnect();
            await database.stop();
        });

        const databaseUrl = database.url;
        await runPrisma(databaseUrl, 'migrate', 'deploy');
        await runPrisma(databaseUrl, 'db', 'seed');
        await runPrisma(databaseUrl, 'db', 'seed');

        prisma = createPrismaClient({ databaseUrl, maxConnections: 2 });

        const [categoryCount, templateCount] = await Promise.all([
            prisma.category.count({ where: { vendorProfileId: null } }),
            prisma.characteristicTemplate.count({ where: { vendorProfileId: null } }),
        ]);
        assert.equal(categoryCount, 126);
        assert.equal(templateCount, 12);

        const category = await prisma.category.findFirstOrThrow({
            where: { vendorProfileId: null, parentId: { not: null } },
            select: { id: true },
        });
        const vendorProfile = await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    id: 'prisma-7-migration-user',
                    name: 'Migration Fixture Owner',
                    email: 'prisma-7-migration@example.test',
                    emailVerified: true,
                },
            });
            await transaction.account.create({
                data: {
                    id: 'prisma-7-migration-account',
                    issuer: 'local:credential',
                    accountId: user.id,
                    providerId: 'credential',
                    userId: user.id,
                    password: 'preserved-bcrypt-hash',
                },
            });
            const organization = await transaction.organization.create({
                data: {
                    id: 'prisma-7-migration-organization',
                    name: 'Migration Fixture Organization',
                    slug: 'prisma-7-migration-organization',
                    createdAt: new Date(),
                },
            });
            const member = await transaction.member.create({
                data: {
                    id: 'prisma-7-migration-member',
                    organizationId: organization.id,
                    userId: user.id,
                    role: 'owner',
                    createdAt: new Date(),
                },
            });
            const vendorProfile = await transaction.vendorProfile.create({
                data: {
                    id: 'prisma-7-migration-profile',
                    organizationId: organization.id,
                    profileKey: 'primary',
                    displayName: 'Migration Fixture Vendor',
                },
            });
            await transaction.organizationPortalSubscription.create({
                data: {
                    organizationId: organization.id,
                    portalKey: 'vendor',
                    status: 'ACTIVE',
                },
            });
            await transaction.memberPortalAccess.create({
                data: {
                    memberId: member.id,
                    portalKey: 'vendor',
                    enabled: true,
                    grantedByUserId: user.id,
                    updatedByUserId: user.id,
                },
            });
            return vendorProfile;
        });
        const product = await prisma.product.create({
            data: {
                vendorProfileId: vendorProfile.id,
                categoryId: category.id,
                sku: 'MIGRATION-SKU-001',
                baseName: 'Migration Fixture Product',
                status: ProductStatus.ACTIVE,
                characteristics: [{ name: 'Color', value: 'Blue' }],
                searchText: 'migration fixture product migration-sku-001',
            },
        });
        const version = await prisma.productVersion.create({
            data: {
                productId: product.id,
                vendorProfileId: vendorProfile.id,
                versionNumber: 1,
                label: 'Original',
                sku: product.sku,
                status: ProductStatus.ACTIVE,
                characteristics: [{ name: 'Color', value: 'Blue' }],
                isPrimary: true,
                searchText: 'migration fixture product original migration-sku-001',
            },
        });

        await runPrisma(databaseUrl, 'migrate', 'deploy');

        const preserved = await prisma.product.findUniqueOrThrow({
            where: { id: product.id },
            include: { versions: true },
        });
        assert.equal(preserved.vendorProfileId, vendorProfile.id);
        assert.equal(preserved.sku, 'MIGRATION-SKU-001');
        assert.deepEqual(preserved.characteristics, [{ name: 'Color', value: 'Blue' }]);
        assert.equal(preserved.versions.length, 1);
        assert.equal(preserved.versions[0]?.id, version.id);
        assert.equal(preserved.versions[0]?.isPrimary, true);
    }
);
