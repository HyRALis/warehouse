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

describe('products', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
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
                where: expect.objectContaining({ vendorId, deletedAt: null, status: 'DRAFT' }),
            })
        );
    });

    it('creates a product in an accessible system or vendor category', async () => {
        mockPrisma.category.findFirst.mockResolvedValue({ id: categoryId });
        mockPrisma.product.create.mockResolvedValue(product);
        mockPrisma.product.update.mockResolvedValue(product);
        mockPrisma.product.findUnique.mockResolvedValue(product);

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
            where: { id: categoryId, OR: [{ vendorId: null }, { vendorId }] },
            select: { id: true },
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

    it('does not return a product owned by a different vendor', async () => {
        mockPrisma.product.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .get(`/api/v1/products/${productId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: productId, vendorId, deletedAt: null } })
        );
    });
});
