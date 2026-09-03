import path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadEnvironment({ path: path.resolve(import.meta.dirname, '.env'), quiet: true });

export default defineConfig({
    schema: 'packages/database/prisma/schema.prisma',
    migrations: {
        path: 'packages/database/prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
