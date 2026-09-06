import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import test from 'node:test';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createPrismaClient } from '../src/index.js';

const execFileAsync = promisify(execFile);
const databaseRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(databaseRoot, '../..');
const prismaConfig = path.join(repositoryRoot, 'prisma.config.ts');
const migrationRoot = path.join(databaseRoot, 'prisma', 'migrations');
const identityMigration = '20260901204932_better_auth_identity';
const entitlementMigration = '20260902083000_vendor_entitlements';
const cleanupMigration = '20260902213000_remove_legacy_vendor_auth';
const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');

const runPrisma = async (databaseUrl: string, ...args: string[]): Promise<void> => {
    await execFileAsync(process.execPath, [prismaCli, ...args, '--config', prismaConfig], {
        cwd: databaseRoot,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        timeout: 120_000,
        windowsHide: true,
    });
};

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
    const databaseName = `vendor_entitlement_test_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
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

const integrationTest = ['true', 'local'].includes(process.env.RUN_DATABASE_INTEGRATION ?? '')
    ? test
    : test.skip;

integrationTest(
    'Vendor entitlements backfill subscriptions, primary profiles, and every catalog owner',
    { timeout: 180_000 },
    async (context) => {
        const database = await startTestDatabase();
        let prisma: ReturnType<typeof createPrismaClient> | undefined;
        context.after(async () => {
            await prisma?.$disconnect();
            await database.stop();
        });

        const migrationNames = (await readdir(migrationRoot, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory() && entry.name < identityMigration)
            .map((entry) => entry.name)
            .sort();
        for (const migrationName of migrationNames) {
            await runPrisma(
                database.url,
                'db',
                'execute',
                '--file',
                path.join(migrationRoot, migrationName, 'migration.sql')
            );
            await runPrisma(database.url, 'migrate', 'resolve', '--applied', migrationName);
        }

        const legacy = createPrismaClient({ databaseUrl: database.url, maxConnections: 1 });
        await legacy.$executeRawUnsafe(
            `INSERT INTO vendors (
                id, email, password_hash, company_name, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            '22222222-2222-4222-8222-222222222222',
            'entitlement-owner@example.test',
            '$2a$12$DlM9tGsOBA.EeEVg2qBaauLyXV1Z5/ek3FEo6ZOyyX14V2L/eOZrq',
            'Entitlement Supply'
        );
        await legacy.$disconnect();

        await runPrisma(
            database.url,
            'db',
            'execute',
            '--file',
            path.join(migrationRoot, identityMigration, 'migration.sql')
        );
        await runPrisma(database.url, 'migrate', 'resolve', '--applied', identityMigration);

        const beforeEntitlements = createPrismaClient({
            databaseUrl: database.url,
            maxConnections: 1,
        });
        await beforeEntitlements.$executeRawUnsafe(`
            INSERT INTO categories (
                id, code, name, aliases, search_text, vendor_id, created_at, updated_at
            ) VALUES
                ('system-category', 'SYSTEM-CATEGORY', 'System Category', '{}', 'system category', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('custom-category', NULL, 'Custom Category', '{}', 'custom category', '22222222-2222-4222-8222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

            INSERT INTO characteristic_templates (
                id, vendor_id, key, name, fields, search_text, created_at, updated_at
            ) VALUES
                ('custom-template', '22222222-2222-4222-8222-222222222222', NULL, 'Custom Template', '[]'::jsonb, 'custom template', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

            INSERT INTO products (
                id, vendor_id, category_id, sku, base_name, status, characteristics,
                search_text, created_at, updated_at
            ) VALUES (
                'entitlement-product', '22222222-2222-4222-8222-222222222222',
                'custom-category', 'ENTITLEMENT-SKU', 'Entitlement Product', 'ACTIVE',
                '[]'::jsonb, 'entitlement product entitlement-sku', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );

            INSERT INTO product_versions (
                id, product_id, vendor_id, version_number, label, sku, status,
                characteristics, is_primary, search_text, created_at, updated_at
            ) VALUES (
                'entitlement-version', 'entitlement-product',
                '22222222-2222-4222-8222-222222222222', 1, 'Original',
                'ENTITLEMENT-SKU', 'ACTIVE', '[]'::jsonb, true,
                'entitlement product original entitlement-sku', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );
        `);
        await beforeEntitlements.$disconnect();

        const entitlementMigrationNames = (await readdir(migrationRoot, { withFileTypes: true }))
            .filter(
                (entry) =>
                    entry.isDirectory() &&
                    entry.name >= entitlementMigration &&
                    entry.name < cleanupMigration
            )
            .map((entry) => entry.name)
            .sort();
        for (const migrationName of entitlementMigrationNames) {
            await runPrisma(
                database.url,
                'db',
                'execute',
                '--file',
                path.join(migrationRoot, migrationName, 'migration.sql')
            );
            await runPrisma(database.url, 'migrate', 'resolve', '--applied', migrationName);
        }

        const compatibilityWriter = createPrismaClient({
            databaseUrl: database.url,
            maxConnections: 1,
        });

        await compatibilityWriter.$executeRawUnsafe(`
            INSERT INTO products (
                id, vendor_id, category_id, sku, base_name, status, characteristics,
                search_text, created_at, updated_at
            ) VALUES (
                'legacy-writer-product', '22222222-2222-4222-8222-222222222222',
                'custom-category', 'LEGACY-WRITER-SKU', 'Legacy Writer Product', 'DRAFT',
                '[]'::jsonb, 'legacy writer product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `);
        await compatibilityWriter.$disconnect();

        await runPrisma(database.url, 'migrate', 'deploy');
        prisma = createPrismaClient({ databaseUrl: database.url, maxConnections: 2 });

        const profile = await prisma.vendorProfile.findUniqueOrThrow({
            where: { id: '22222222-2222-4222-8222-222222222222' },
        });
        assert.equal(profile.id, '22222222-2222-4222-8222-222222222222');
        assert.equal(profile.profileKey, 'primary');
        assert.equal(profile.displayName, 'Entitlement Supply');

        const [
            subscription,
            ownerAccess,
            product,
            legacyWriterProduct,
            version,
            category,
            template,
            systemCategory,
        ] = await Promise.all([
            prisma.organizationPortalSubscription.findUniqueOrThrow({
                where: {
                    organizationId_portalKey: {
                        organizationId: profile.organizationId,
                        portalKey: 'vendor',
                    },
                },
            }),
            prisma.memberPortalAccess.findFirstOrThrow({
                where: {
                    member: { organizationId: profile.organizationId, role: 'owner' },
                    portalKey: 'vendor',
                },
            }),
            prisma.product.findUniqueOrThrow({ where: { id: 'entitlement-product' } }),
            prisma.product.findUniqueOrThrow({ where: { id: 'legacy-writer-product' } }),
            prisma.productVersion.findUniqueOrThrow({
                where: { id: 'entitlement-version' },
            }),
            prisma.category.findUniqueOrThrow({ where: { id: 'custom-category' } }),
            prisma.characteristicTemplate.findUniqueOrThrow({
                where: { id: 'custom-template' },
            }),
            prisma.category.findUniqueOrThrow({ where: { id: 'system-category' } }),
        ]);

        assert.equal(subscription.status, 'ACTIVE');
        assert.equal(ownerAccess.enabled, true);
        assert.equal(product.vendorProfileId, profile.id);
        assert.equal(legacyWriterProduct.vendorProfileId, profile.id);
        assert.equal(version.vendorProfileId, profile.id);
        assert.equal(category.vendorProfileId, profile.id);
        assert.equal(template.vendorProfileId, profile.id);
        assert.equal(systemCategory.vendorProfileId, null);

        const legacyStructures = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
            SELECT table_name AS name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'vendors'
            UNION ALL
            SELECT table_name || '.' || column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND (
                  (table_name = 'user' AND column_name = 'legacyVendorId')
                  OR (table_name = 'vendor_profiles' AND column_name = 'legacy_vendor_id')
                  OR (
                      table_name IN (
                          'categories',
                          'products',
                          'product_versions',
                          'characteristic_templates'
                      )
                      AND column_name = 'vendor_id'
                  )
              )
            UNION ALL
            SELECT trigger_name AS name
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
              AND trigger_name LIKE '%sync_vendor_profile_ownership'
        `);
        assert.deepEqual(legacyStructures, []);

        await assert.rejects(
            prisma.vendorProfile.create({
                data: {
                    organizationId: profile.organizationId,
                    profileKey: 'primary',
                    displayName: 'Duplicate Primary',
                },
            }),
            (error: { code?: string }) => error.code === 'P2002'
        );
    }
);
