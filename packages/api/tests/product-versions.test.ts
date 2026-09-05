import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';
import { StorageService } from '../src/services/storage.service';

jest.mock('../src/services/qrcode.service', () => ({
    QRCodeService: { generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

jest.mock('../src/services/storage.service', () => ({
    StorageService: {
        uploadFile: jest.fn(),
        deleteFile: jest.fn(),
    },
}));

const vendorId = 'vendor-1';
const otherVendorId = 'vendor-2';
const token = generateTestToken(vendorId);
const productId = '9cc10440-333c-4f0a-92be-082962cfa80f';
const originalId = '4a48cdb1-b253-4c6d-bd51-2dfb24dd4b51';
const copyId = '02fa660b-58a8-41d7-9e20-ed32b3ce517b';

const product = {
    id: productId,
    vendorId,
    baseName: 'Creator Hoodie',
    status: 'ACTIVE',
    deletedAt: null,
    category: { name: 'Apparel' },
};

const original = {
    id: originalId,
    productId,
    vendorId,
    versionNumber: 1,
    label: 'Original',
    sku: 'HOODIE-ORIGINAL',
    barcode: null,
    qrCodeUrl: null,
    status: 'ACTIVE',
    characteristics: [{ name: 'Color', value: 'Black' }],
    designNotes: 'First release',
    isPrimary: true,
    deletedAt: null,
    images: [{ id: 'image-1', imageUrl: 'https://media.example/hoodie.webp', sortOrder: 0 }],
    product,
};

const copied = {
    ...original,
    id: copyId,
    versionNumber: 2,
    label: 'Summer Drop',
    sku: 'HOODIE-SUMMER',
    status: 'DRAFT',
    isPrimary: false,
};

describe('product versions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
        mockPrisma.$queryRaw.mockResolvedValue([{ id: productId }]);
    });

    it('copies characteristics and image references without uploading another R2 object', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(product);
        mockPrisma.productVersion.findFirst
            .mockResolvedValueOnce(original)
            .mockResolvedValueOnce({ versionNumber: 1 });
        mockPrisma.productVersion.create.mockResolvedValue(copied);
        mockPrisma.productVersion.findUnique.mockResolvedValue(copied);

        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                label: 'Summer Drop',
                mode: 'COPY',
                sourceVersionId: originalId,
                sku: 'HOODIE-SUMMER',
                generateQrCode: false,
                copyImages: true,
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.productVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                label: 'Summer Drop',
                characteristics: original.characteristics,
                designNotes: original.designNotes,
                barcode: null,
                isPrimary: false,
            }),
        });
        expect(mockPrisma.productImage.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    productVersionId: copyId,
                    imageUrl: original.images[0].imageUrl,
                }),
            ],
        });
        expect(StorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('serializes primary changes under a product row lock and mirrors transitional fields', async () => {
        mockPrisma.productVersion.findFirst.mockResolvedValue(copied);
        mockPrisma.productVersion.findUnique.mockResolvedValue({ ...copied, isPrimary: true });

        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions/${copyId}/primary`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        expect(mockPrisma.productVersion.updateMany).toHaveBeenCalledWith({
            where: { productId, deletedAt: null },
            data: { isPrimary: false },
        });
        expect(mockPrisma.productVersion.update).toHaveBeenCalledWith({
            where: { id: copyId },
            data: { isPrimary: true },
        });
        expect(mockPrisma.product.update).toHaveBeenCalledWith({
            where: { id: productId },
            data: expect.objectContaining({
                sku: copied.sku,
                searchText: expect.stringContaining(copied.sku.toLowerCase()),
            }),
        });
    });

    it('guards the primary version and soft-deletes a non-primary version', async () => {
        mockPrisma.productVersion.findFirst.mockResolvedValueOnce({
            id: originalId,
            isPrimary: true,
        });
        const primaryResponse = await request(app)
            .delete(`/api/v1/products/${productId}/versions/${originalId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(primaryResponse.status).toBe(409);

        mockPrisma.productVersion.findFirst.mockResolvedValueOnce({ id: copyId, isPrimary: false });
        mockPrisma.productVersion.count.mockResolvedValue(2);
        mockPrisma.productVersion.update.mockResolvedValue(copied);
        const copyResponse = await request(app)
            .delete(`/api/v1/products/${productId}/versions/${copyId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(copyResponse.status).toBe(200);
        expect(mockPrisma.productVersion.update).toHaveBeenCalledWith({
            where: { id: copyId },
            data: { deletedAt: expect.any(Date), status: 'DISCONTINUED' },
        });
        expect(mockPrisma.$transaction).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ isolationLevel: 'Serializable' })
        );
    });

    it('reports effective lifecycle status for product and version combinations', async () => {
        mockPrisma.product.findFirst.mockResolvedValue({ id: productId, status: 'DRAFT' });
        mockPrisma.productVersion.findMany.mockResolvedValue([
            { ...original, product: { ...product, status: 'DRAFT' }, status: 'ACTIVE' },
            { ...copied, status: 'DISCONTINUED' },
        ]);

        const response = await request(app)
            .get(`/api/v1/products/${productId}/versions`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].effectiveStatus).toBe('DRAFT');
        expect(response.body.data[1].effectiveStatus).toBe('DISCONTINUED');
        expect(response.body.data[0].canDelete).toBe(false);
        expect(response.body.data[1].canDelete).toBe(true);
    });

    it('keeps a shared R2 object when another copied version still references it', async () => {
        mockPrisma.product.findFirst.mockResolvedValue({
            ...product,
            imageUrl: original.images[0].imageUrl,
        });
        mockPrisma.productImage.findFirst.mockResolvedValue({
            ...original.images[0],
            productId,
            productVersionId: originalId,
        });
        mockPrisma.productImage.count.mockResolvedValue(1);
        mockPrisma.productImage.delete.mockResolvedValue(original.images[0]);

        const response = await request(app)
            .delete(`/api/v1/products/${productId}/images/image-1`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(StorageService.deleteFile).not.toHaveBeenCalled();
    });

    it('deletes the R2 object after its final media reference is removed', async () => {
        mockPrisma.product.findFirst.mockResolvedValue({ ...product, imageUrl: null });
        mockPrisma.productImage.findFirst.mockResolvedValue({
            ...original.images[0],
            productId,
            productVersionId: originalId,
        });
        mockPrisma.productImage.count.mockResolvedValue(0);
        mockPrisma.productImage.delete.mockResolvedValue(original.images[0]);

        const response = await request(app)
            .delete(`/api/v1/products/${productId}/images/image-1`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(StorageService.deleteFile).toHaveBeenCalledWith(original.images[0].imageUrl);
    });

    it('denies cross-vendor product and version access', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(null);
        const createResponse = await request(app)
            .post(`/api/v1/products/${productId}/versions`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Blocked', mode: 'BLANK' });
        expect(createResponse.status).toBe(404);

        mockPrisma.vendor.findFirst.mockResolvedValue({ id: otherVendorId });
        mockPrisma.productVersion.findFirst.mockResolvedValue(null);
        const detailResponse = await request(app)
            .get(`/api/v1/products/${productId}/versions/${copyId}`)
            .set('Authorization', `Bearer ${generateTestToken(otherVendorId)}`);
        expect(detailResponse.status).toBe(404);
    });

    it('returns a tenant-wide identifier conflict for duplicate version SKUs', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(product);
        mockPrisma.productVersion.findFirst.mockResolvedValue({ versionNumber: 1 });
        mockPrisma.productVersion.create.mockRejectedValue({ code: 'P2002' });

        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Duplicate', mode: 'BLANK', sku: original.sku });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('IDENTIFIER_CONFLICT');
    });

    it('rechecks product ownership under the row lock before creating a version', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(product);
        mockPrisma.$queryRaw.mockResolvedValueOnce([]);

        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Racing version', mode: 'BLANK', generateQrCode: false });

        expect(response.status).toBe(404);
        expect(response.body.code).toBe('PRODUCT_NOT_FOUND');
        expect(mockPrisma.productVersion.create).not.toHaveBeenCalled();
    });

    it('removes an uploaded object when the version-image database write fails', async () => {
        const imageUrl = 'https://media.example.test/products/failed.webp';
        mockPrisma.productVersion.findFirst.mockResolvedValue({
            ...copied,
            images: [],
            isPrimary: false,
        });
        (StorageService.uploadFile as jest.Mock).mockResolvedValue(imageUrl);
        mockPrisma.productImage.create.mockRejectedValue(new Error('database unavailable'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions/${copyId}/images`)
            .set('Authorization', `Bearer ${token}`)
            .attach('image', Buffer.from([0xff, 0xd8, 0xff]), {
                filename: 'version.jpg',
                contentType: 'image/jpeg',
            });

        consoleError.mockRestore();
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Internal Server Error');
        expect(StorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
    });

    it('rechecks the image limit after upload and removes the uncommitted object', async () => {
        const imageUrl = 'https://media.example.test/products/overflow.webp';
        mockPrisma.productVersion.findFirst
            .mockResolvedValueOnce({ ...copied, images: [] })
            .mockResolvedValueOnce({ ...copied, images: Array(4).fill(original.images[0]) });
        (StorageService.uploadFile as jest.Mock).mockResolvedValue(imageUrl);
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions/${copyId}/images`)
            .set('Authorization', `Bearer ${token}`)
            .attach('image', Buffer.from([0xff, 0xd8, 0xff]), {
                filename: 'version.jpg', contentType: 'image/jpeg',
            });
        consoleError.mockRestore();
        expect(response.status).toBe(409);
        expect(response.body.code).toBe('IMAGE_LIMIT_EXCEEDED');
        expect(mockPrisma.productImage.create).not.toHaveBeenCalled();
        expect(StorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
    });

    it('does not replace the cover when the uploaded version ceased being primary', async () => {
        mockPrisma.productVersion.findFirst
            .mockResolvedValueOnce({ ...original, images: [] })
            .mockResolvedValueOnce({ ...original, isPrimary: false, images: [] });
        (StorageService.uploadFile as jest.Mock).mockResolvedValue('https://media.example.test/image.webp');
        mockPrisma.productImage.create.mockResolvedValue({ id: 'image-2' });
        const response = await request(app)
            .post(`/api/v1/products/${productId}/versions/${originalId}/images`)
            .set('Authorization', `Bearer ${token}`)
            .attach('image', Buffer.from([0xff, 0xd8, 0xff]), {
                filename: 'version.jpg', contentType: 'image/jpeg',
            });
        expect(response.status).toBe(201);
        expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });
});
