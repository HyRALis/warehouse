import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

const allowedExtensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
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

const invalidStorageValue = (
    message: string,
    code = 'INVALID_STORAGE_KEY'
): Error & {
    statusCode: number;
    code: string;
} => Object.assign(new Error(message), { statusCode: 400, code });

const isValidImageContent = (mimeType: string, buffer: Buffer): boolean => {
    if (mimeType === 'image/jpeg') {
        return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === 'image/png') {
        return (
            buffer.length >= 8 &&
            buffer
                .subarray(0, 8)
                .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        );
    }
    if (mimeType === 'image/webp') {
        return (
            buffer.length >= 12 &&
            buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
            buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        );
    }
    return false;
};

const relativeObjectKey = (url: URL, publicBase: URL): string => {
    if (url.origin !== publicBase.origin) {
        throw invalidStorageValue('Storage URL origin is not allowed');
    }

    const basePath = decodeURIComponent(publicBase.pathname).replace(/^\/+|\/+$/g, '');
    const objectPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (basePath && !objectPath.startsWith(`${basePath}/`)) {
        throw invalidStorageValue('Storage URL path is not allowed');
    }
    return basePath ? objectPath.slice(basePath.length + 1) : objectPath;
};

const objectKeyFromUrl = (value: string): string => {
    let parsedUrl: URL | undefined;
    try {
        parsedUrl = new URL(value);
    } catch {
        parsedUrl = undefined;
    }

    if (config.r2) {
        return parsedUrl
            ? relativeObjectKey(parsedUrl, new URL(config.r2.publicUrl))
            : value.replace(/^\/+/, '');
    }

    if (parsedUrl) {
        const uploadsBase = new URL('/uploads/', `${config.apiPublicUrl}/`);
        return relativeObjectKey(parsedUrl, uploadsBase);
    }
    return path.basename(value);
};

export class StorageService {
    /**
     * Store an image through the configured development-local or Cloudflare R2 driver.
     */
    static async uploadFile(file: Express.Multer.File): Promise<string> {
        const extension = allowedExtensions[file.mimetype];
        if (!extension)
            throw invalidStorageValue('Unsupported image MIME type', 'INVALID_IMAGE_TYPE');
        if (!isValidImageContent(file.mimetype, file.buffer)) {
            throw invalidStorageValue(
                'Image content does not match its declared MIME type',
                'INVALID_IMAGE_CONTENT'
            );
        }

        const filename = `${crypto.randomUUID()}${extension}`;
        if (config.storageDriver === 'r2') {
            const objectKey = `products/${filename}`;
            await getR2Client().send(
                new PutObjectCommand({
                    Bucket: config.r2!.bucket,
                    Key: objectKey,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ContentDisposition: 'inline',
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
        const validKey =
            config.storageDriver === 'r2'
                ? /^products\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(objectKey)
                : /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(objectKey);
        if (!validKey) {
            throw invalidStorageValue('Invalid storage key');
        }

        if (config.storageDriver === 'r2') {
            await getR2Client().send(
                new DeleteObjectCommand({ Bucket: config.r2!.bucket, Key: objectKey })
            );
            return;
        }

        const safeFilename = path.basename(objectKey);

        try {
            await fs.unlink(path.join(config.uploadDir, safeFilename));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
    }
}
