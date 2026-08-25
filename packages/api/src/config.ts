import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const environmentSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        PORT: z.coerce.number().int().positive().default(4000),
        JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
        CORS_ORIGINS: z.string().default('http://localhost:3000'),
        API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
        UPLOAD_DIR: z.string().optional(),
        STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
        ALLOW_LOCAL_STORAGE_IN_PRODUCTION: z.enum(['true', 'false']).default('false'),
        R2_ACCOUNT_ID: z.string().optional(),
        R2_BUCKET: z.string().optional(),
        R2_ACCESS_KEY_ID: z.string().optional(),
        R2_SECRET_ACCESS_KEY: z.string().optional(),
        R2_PUBLIC_URL: z.string().url().optional(),
        TRUST_PROXY: z.enum(['true', 'false']).default('false'),
    })
    .superRefine((environment, context) => {
        if (environment.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['CORS_ORIGINS'],
                message: 'CORS_ORIGINS is required in production',
            });
        }

        if (environment.NODE_ENV === 'production' && !process.env.API_PUBLIC_URL) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['API_PUBLIC_URL'],
                message: 'API_PUBLIC_URL is required in production',
            });
        }

        if (
            environment.NODE_ENV === 'production' &&
            environment.STORAGE_DRIVER === 'local' &&
            environment.ALLOW_LOCAL_STORAGE_IN_PRODUCTION !== 'true'
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['STORAGE_DRIVER'],
                message: 'Production must use R2 unless local storage is explicitly allowed',
            });
        }

        if (environment.STORAGE_DRIVER === 'r2') {
            const requiredR2Fields = [
                'R2_ACCOUNT_ID',
                'R2_BUCKET',
                'R2_ACCESS_KEY_ID',
                'R2_SECRET_ACCESS_KEY',
                'R2_PUBLIC_URL',
            ] as const;

            for (const field of requiredR2Fields) {
                if (!environment[field]) {
                    context.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [field],
                        message: `${field} is required when STORAGE_DRIVER=r2`,
                    });
                }
            }
        }
    });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
    const details = parsedEnvironment.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
    throw new Error(`Invalid API configuration: ${details}`);
}

const environment = parsedEnvironment.data;

export const config = {
    nodeEnv: environment.NODE_ENV,
    port: environment.PORT,
    jwtSecret: environment.JWT_SECRET,
    corsOrigins: environment.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    apiPublicUrl: environment.API_PUBLIC_URL.replace(/\/$/, ''),
    uploadDir: path.resolve(environment.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
    storageDriver: environment.STORAGE_DRIVER,
    r2:
        environment.STORAGE_DRIVER === 'r2'
            ? {
                  accountId: environment.R2_ACCOUNT_ID!,
                  bucket: environment.R2_BUCKET!,
                  accessKeyId: environment.R2_ACCESS_KEY_ID!,
                  secretAccessKey: environment.R2_SECRET_ACCESS_KEY!,
                  publicUrl: environment.R2_PUBLIC_URL!.replace(/\/$/, ''),
              }
            : null,
    trustProxy: environment.TRUST_PROXY === 'true',
    sessionCookieName: 'vendor_session',
    sessionDurationMs: 7 * 24 * 60 * 60 * 1000,
} as const;
