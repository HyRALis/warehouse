import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

jest.mock('../src/services/qrcode.service', () => ({
    QRCodeService: { generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);
const categoryId = '32dbce22-6db5-4e2c-9b59-06ed5460a7e3';

describe('bulk product operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
    });

    it('imports a valid CSV through the dedicated CSV upload path', async () => {
        mockPrisma.category.findFirst.mockResolvedValue({ id: categoryId });
        mockPrisma.product.create.mockResolvedValue({ id: 'product-1' });
        mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
        const csv = `sku,baseName,categoryId,status\nSKU-1,Imported product,${categoryId},ACTIVE`;

        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), { filename: 'products.csv', contentType: 'text/csv' });

        expect(response.status).toBe(200);
        expect(response.body.data.imported).toBe(1);
        expect(mockPrisma.product.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ vendorId, status: 'ACTIVE' }) })
        );
    });

    it('reports a row error instead of importing into another vendor’s category', async () => {
        mockPrisma.category.findFirst.mockResolvedValue(null);
        const csv = `sku,baseName,categoryId\nSKU-1,Imported product,${categoryId}`;

        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), { filename: 'products.csv', contentType: 'text/csv' });

        expect(response.status).toBe(200);
        expect(response.body.data.imported).toBe(0);
        expect(response.body.data.errors[0]).toContain('Category is not available');
        expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('exports only the authenticated vendor’s products', async () => {
        mockPrisma.product.findMany.mockResolvedValue([]);

        const response = await request(app)
            .get('/api/v1/products/export')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { vendorId, deletedAt: null } })
        );
    });
});
