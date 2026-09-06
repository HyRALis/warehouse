import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createPrismaClient } from '../../src/index.js';

/** Every review test gets a disposable database; never migrate the configured application DB. */
export const startReviewDatabase = async () => {
    let url: string;
    let stop: () => Promise<void>;
    if (process.env.RUN_DATABASE_INTEGRATION === 'local') {
        const base = new URL(process.env.DATABASE_URL!);
        if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
            throw new Error('Local review tests require a localhost PostgreSQL server');
        }
        const name = `vendor_review_${randomUUID().replaceAll('-', '')}`;
        const adminUrl = new URL(base);
        adminUrl.pathname = '/postgres';
        adminUrl.searchParams.delete('schema');
        const admin = createPrismaClient({ databaseUrl: adminUrl.toString(), maxConnections: 1 });
        try {
            await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
        } catch (error) {
            await admin.$disconnect();
            throw error;
        }
        base.pathname = `/${name}`;
        base.searchParams.set('schema', 'public');
        url = base.toString();
        stop = async () => {
            // Only the generated, validated test name is ever a deletion target.
            if (!/^vendor_review_[a-f0-9]{32}$/.test(name))
                throw new Error('Invalid test database');
            try {
                await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
            } finally {
                await admin.$disconnect();
            }
        };
    } else {
        const container = await new PostgreSqlContainer('postgres:16-alpine').start();
        url = container.getConnectionUri();
        stop = () => container.stop().then(() => undefined);
    }
    const databaseRoot = path.resolve(import.meta.dirname, '../..');
    const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
    try {
        await promisify(execFile)(
            process.execPath,
            [
                cli,
                'migrate',
                'deploy',
                '--config',
                path.resolve(databaseRoot, '../../prisma.config.ts'),
            ],
            {
                cwd: databaseRoot,
                env: { ...process.env, DATABASE_URL: url },
                timeout: 120_000,
                windowsHide: true,
            }
        );
    } catch (error) {
        await stop();
        throw error;
    }
    const database = createPrismaClient({ databaseUrl: url, maxConnections: 4 });
    return {
        database,
        stop: async () => {
            try {
                await database.$disconnect();
            } finally {
                await stop();
            }
        },
    };
};
