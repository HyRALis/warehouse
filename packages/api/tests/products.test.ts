import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

jest.mock('../src/services/qrcode.service', () => ({
    QRCodeService: { generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);
const categoryId = '32dbce22-6db5-4e2c-9b59-06ed5460a7e3';
const productId = '9cc10440-333c-4f0a-92be-082962cfa80f';

const product = {
    id: productId,
    vendorId,
    vendorProfileId: vendorId,
    categoryId,
    sku: 'SKU-1',
    baseName: 'Test product',
    barcode: null,
    qrCodeUrl: null,
    status: 'DRAFT',
    characteristics: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    images: [],
};

const version = {
    id: '4a48cdb1-b253-4c6d-bd51-2dfb24dd4b51',
    productId,
    vendorId,
    vendorProfileId: vendorId,
    versionNumber: 1,
    label: 'Original',
    sku: 'SKU-1',
    barcode: null,
    qrCodeUrl: null,
    status: 'DRAFT',
    characteristics: [],
    designNotes: null,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    images: [],
};

describe('products', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
        mockPrisma.$queryRaw.mockResolvedValue([{ id: productId }]);
    });

    it('scopes product listing to the authenticated vendor', async () => {
        mockPrisma.product.count.mockResolvedValue(1);
        mockPrisma.product.findMany.mockResolvedValue([product]);

        const response = await request(app)
            .get('/api/v1/products?status=DRAFT')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    vendorProfileId: vendorId,
                    deletedAt: null,
                    status: 'DRAFT',
                }),
            })
        );
    });

    it('creates a product in an accessible system or vendor category', async () => {
        mockPrisma.category.findFirst.mockResolvedValue({ id: categoryId });
        mockPrisma.product.create.mockResolvedValue(product);
        mockPrisma.product.update.mockResolvedValue(product);
        mockPrisma.productVersion.create.mockResolvedValue(version);
        mockPrisma.productVersion.update.mockResolvedValue(version);
        mockPrisma.product.findUnique.mockResolvedValue({
            ...product,
            versions: [version],
            _count: { versions: 1 },
        });

        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
                categoryId,
                sku: product.sku,
                baseName: product.baseName,
                characteristics: [],
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
            where: {
                id: categoryId,
                OR: [{ vendorProfileId: null }, { vendorProfileId: vendorId }],
            },
            select: { id: true, name: true },
        });
        expect(mockPrisma.productVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                productId,
                vendorId,
                vendorProfileId: vendorId,
                label: 'Original',
                versionNumber: 1,
                sku: product.sku,
                status: 'DRAFT',
                isPrimary: true,
            }),
        });
        expect(response.body.data.versionCount).toBe(1);
        expect(response.body.data.primaryVersion.label).toBe('Original');
    });

    it('generates an SKU and keeps independent product and version statuses', async () => {
        mockPrisma.category.findFirst.mockResolvedValue({ id: categoryId, name: 'Electronics' });
        mockPrisma.product.findFirst.mockResolvedValue(null);
        mockPrisma.productVersion.findFirst.mockResolvedValue(null);
        mockPrisma.product.create.mockImplementation(async ({ data }: any) => ({
            ...product,
            sku: data.sku,
            status: data.status,
        }));
        mockPrisma.productVersion.create.mockImplementation(async ({ data }: any) => ({
            ...version,
            sku: data.sku,
            status: data.status,
        }));
        mockPrisma.product.findUnique.mockResolvedValue({
            ...product,
            status: 'ACTIVE',
            versions: [{ ...version, sku: 'TEST-PRODUCT-ABC123' }],
            _count: { versions: 1 },
        });

        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
                categoryId,
                baseName: 'Test Product',
                characteristics: [],
                productStatus: 'ACTIVE',
                versionStatus: 'DISCONTINUED',
                generateQrCode: false,
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.product.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                sku: expect.stringMatching(/^TEST-PRODUCT-[A-Z0-9]{6}$/),
                status: 'ACTIVE',
            }),
        });
        expect(mockPrisma.productVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                sku: expect.stringMatching(/^TEST-PRODUCT-[A-Z0-9]{6}$/),
                status: 'DISCONTINUED',
            }),
        });
    });

    it('rejects product creation with another vendor’s category', async () => {
        mockPrisma.category.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
                categoryId,
                sku: product.sku,
                baseName: product.baseName,
                characteristics: [],
            });

        expect(response.status).toBe(400);
        expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('returns a conflict for a duplicate SKU or barcode', async () => {
        mockPrisma.category.findFirst.mockResolvedValue({ id: categoryId, name: 'Electronics' });
        mockPrisma.product.create.mockRejectedValue({ code: 'P2002' });

        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
                categoryId,
                sku: product.sku,
                baseName: product.baseName,
                characteristics: [],
            });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('IDENTIFIER_CONFLICT');
    });

    it('does not return a product owned by a different vendor', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .get(`/api/v1/products/${productId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: productId, vendorProfileId: vendorId, deletedAt: null },
            })
        );
    });

    it('updates the product and primary-version identifiers in one serialized transaction', async () => {
        const primaryVersion = {
            id: version.id,
            label: version.label,
            sku: version.sku,
            barcode: version.barcode,
            characteristics: version.characteristics,
        };
        mockPrisma.product.findFirst.mockResolvedValue({
            ...product,
            category: { name: 'Electronics' },
            versions: [primaryVersion],
        });
        mockPrisma.product.update.mockResolvedValue({ ...product, sku: 'SKU-2' });
        mockPrisma.productVersion.update.mockResolvedValue({ ...version, sku: 'SKU-2' });
        mockPrisma.product.findUnique.mockResolvedValue({
            ...product,
            sku: 'SKU-2',
            barcode: null,
            status: 'ACTIVE',
            versions: [{ ...version, sku: 'SKU-2' }],
            _count: { versions: 1 },
        });

        const response = await request(app)
            .put(`/api/v1/products/${productId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sku: 'SKU-2', barcode: null, status: 'ACTIVE' });

        expect(response.status).toBe(200);
        expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        expect(mockPrisma.productVersion.update).toHaveBeenCalledWith({
            where: { id: version.id },
            data: expect.objectContaining({ sku: 'SKU-2', barcode: null }),
        });
        expect(response.body.data.primaryVersion.sku).toBe('SKU-2');
    });

    it('returns a retryable conflict when a concurrent product update loses serialization', async () => {
        mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });

        const response = await request(app)
            .put(`/api/v1/products/${productId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'ACTIVE' });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('PRODUCT_CONFLICT');
    });
});
