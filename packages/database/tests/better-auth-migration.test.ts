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

    const databaseName = `better_auth_test_${Date.now()}_${Math.random()
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

const integrationTest =
    ['true', 'local'].includes(process.env.RUN_DATABASE_INTEGRATION ?? '') ? test : test.skip;

integrationTest(
    'Better Auth migration preserves credentials and creates one Owner organization per Vendor',
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

        const legacyPassword = '$2a$12$DlM9tGsOBA.EeEVg2qBaauLyXV1Z5/ek3FEo6ZOyyX14V2L/eOZrq';
        const legacy = createPrismaClient({ databaseUrl: database.url, maxConnections: 1 });
        await legacy.vendor.create({
            data: {
                id: '11111111-1111-4111-8111-111111111111',
                email: 'Owner@Example.com',
                passwordHash: legacyPassword,
                companyName: 'Legacy Supply',
                passwordResetTokenHash: 'unused-reset-token-hash',
                passwordResetExpiresAt: new Date(Date.now() + 60_000),
            },
        });
        await legacy.$disconnect();

        await runPrisma(database.url, 'migrate', 'deploy');
        prisma = createPrismaClient({ databaseUrl: database.url, maxConnections: 2 });

        const identity = await prisma.user.findUniqueOrThrow({
            where: { legacyVendorId: '11111111-1111-4111-8111-111111111111' },
            include: { accounts: true, members: { include: { organization: true } } },
        });
        assert.equal(identity.id, '11111111-1111-4111-8111-111111111111');
        assert.equal(identity.email, 'owner@example.com');
        assert.equal(identity.emailVerified, true);
        assert.equal(identity.accounts.length, 1);
        assert.equal(identity.accounts[0]?.issuer, 'local:credential');
        assert.equal(identity.accounts[0]?.providerId, 'credential');
        assert.equal(identity.accounts[0]?.password, legacyPassword);
        assert.equal(identity.members.length, 1);
        assert.equal(identity.members[0]?.role, 'owner');
        assert.equal(identity.members[0]?.organization.name, 'Legacy Supply');
        assert.equal(await prisma.session.count({ where: { userId: identity.id } }), 0);

        const migratedVendor = await prisma.vendor.findUniqueOrThrow({
            where: { id: identity.legacyVendorId! },
        });
        assert.equal(migratedVendor.email, 'owner@example.com');
        assert.equal(migratedVendor.passwordResetTokenHash, null);
        assert.equal(migratedVendor.passwordResetExpiresAt, null);
    }
);
