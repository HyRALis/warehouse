import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

const allowedExtensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
};

let r2Client: S3Client | undefined;

const getR2Client = (): S3Client => {
    if (!config.r2) throw new Error('R2 storage is not configured');

    r2Client ??= new S3Client({
        region: 'auto',
        endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.r2.accessKeyId,
            secretAccessKey: config.r2.secretAccessKey,
        },
    });

    return r2Client;
};

const objectKeyFromUrl = (value: string): string => {
    try {
        const url = new URL(value);
        if (config.r2) {
            const publicBasePath = new URL(config.r2.publicUrl).pathname.replace(/^\/+|\/+$/g, '');
            const objectPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
            return publicBasePath && objectPath.startsWith(`${publicBasePath}/`)
                ? objectPath.slice(publicBasePath.length + 1)
                : objectPath;
        }

        return path.basename(url.pathname);
    } catch {
        return config.r2 ? value.replace(/^\/+/, '') : path.basename(value);
    }
};

export class StorageService {
    /**
     * Store an image through the configured development-local or Cloudflare R2 driver.
     */
    static async uploadFile(file: Express.Multer.File): Promise<string> {
        const extension = allowedExtensions[file.mimetype];
        if (!extension) throw new Error('Unsupported image MIME type');

        const filename = `${crypto.randomUUID()}${extension}`;
        if (config.storageDriver === 'r2') {
            const objectKey = `products/${filename}`;
            await getR2Client().send(
                new PutObjectCommand({
                    Bucket: config.r2!.bucket,
                    Key: objectKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    CacheControl: 'public, max-age=31536000, immutable',
                })
            );
            return `${config.r2!.publicUrl}/${objectKey}`;
        }

        await fs.mkdir(config.uploadDir, { recursive: true });
        await fs.writeFile(path.join(config.uploadDir, filename), file.buffer, { flag: 'wx' });
        return `${config.apiPublicUrl}/uploads/${filename}`;
    }

    /**
     * Delete an image through the configured storage driver.
     */
    static async deleteFile(urlOrKey: string): Promise<void> {
        const objectKey = objectKeyFromUrl(urlOrKey);
        if (!objectKey || objectKey.includes('..')) throw new Error('Invalid storage key');

        if (config.storageDriver === 'r2') {
            await getR2Client().send(
                new DeleteObjectCommand({ Bucket: config.r2!.bucket, Key: objectKey })
            );
            return;
        }

        const safeFilename = path.basename(objectKey);
        if (safeFilename !== objectKey) throw new Error('Invalid storage key');

        try {
            await fs.unlink(path.join(config.uploadDir, safeFilename));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
    }
}
