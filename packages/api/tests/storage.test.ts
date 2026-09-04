const mockSend = jest.fn();
const mockPutObjectCommand = jest.fn((input) => ({ operation: 'put', input }));
const mockDeleteObjectCommand = jest.fn((input) => ({ operation: 'delete', input }));

jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({ send: mockSend })),
    PutObjectCommand: mockPutObjectCommand,
    DeleteObjectCommand: mockDeleteObjectCommand,
}));

jest.mock('../src/config', () => ({
    config: {
        storageDriver: 'r2',
        apiPublicUrl: 'http://localhost:4000',
        uploadDir: 'unused',
        r2: {
            accountId: 'account-id',
            bucket: 'vendor-media',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
            publicUrl: 'https://media.example.test/catalog',
        },
    },
}));

import { StorageService } from '../src/services/storage.service';

const imageFile = (mimetype: string, buffer: Buffer): Express.Multer.File =>
    ({
        fieldname: 'image',
        originalname: 'upload',
        encoding: '7bit',
        mimetype,
        size: buffer.length,
        buffer,
    }) as Express.Multer.File;

describe('R2 storage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockResolvedValue({});
    });

    it.each([
        ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'jpg'],
        [
            'image/png',
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            'png',
        ],
        ['image/webp', Buffer.from('RIFF0000WEBP'), 'webp'],
    ])('uploads verified %s content with immutable cache metadata', async (mime, buffer, extension) => {
        const url = await StorageService.uploadFile(imageFile(mime, buffer));

        expect(url).toMatch(
            new RegExp(`^https://media\\.example\\.test/catalog/products/[0-9a-f-]{36}\\.${extension}$`)
        );
        expect(mockPutObjectCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                Bucket: 'vendor-media',
                Key: expect.stringMatching(new RegExp(`^products/.+\\.${extension}$`)),
                ContentType: mime,
                ContentDisposition: 'inline',
                CacheControl: 'public, max-age=31536000, immutable',
            })
        );
    });

    it('rejects content whose bytes do not match the declared MIME type', async () => {
        await expect(
            StorageService.uploadFile(imageFile('image/png', Buffer.from('not-a-png')))
        ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_IMAGE_CONTENT' });
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('deletes only generated product keys under the configured public origin and path', async () => {
        const key = 'products/123e4567-e89b-12d3-a456-426614174000.webp';
        await StorageService.deleteFile(`https://media.example.test/catalog/${key}`);

        expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: 'vendor-media',
            Key: key,
        });
        await expect(
            StorageService.deleteFile(`https://attacker.example/${key}`)
        ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_STORAGE_KEY' });
        await expect(StorageService.deleteFile('products/../../secret')).rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_STORAGE_KEY',
        });
    });
});
