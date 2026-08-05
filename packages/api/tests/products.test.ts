import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma, generateTestToken } from './setup';

jest.mock('../src/services/storage.service', () => ({
    uploadImage: jest.fn().mockResolvedValue('https://storage.example.com/image.jpg'),
    deleteImage: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/qrcode.service', () => ({
    generateQRCode: jest.fn().mockResolvedValue('https://storage.example.com/qr.png'),
}));

describe('Product Endpoints', () => {
    let token: string;
    const vendorId = 'vendor123';

    beforeEach(() => {
        jest.clearAllMocks();
        token = generateTestToken(vendorId);
    });

    describe('GET /api/v1/products', () => {
        it('should return paginated list of products (200)', async () => {
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod1', name: 'Product 1' }]);
            mockPrisma.product.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('meta');
        });

        it('should filter by status', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.product.count.mockResolvedValue(0);

            await request(app)
                .get('/api/v1/products?status=ACTIVE')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'ACTIVE', vendorId }),
                })
            );
        });

        it('should filter by categoryId', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.product.count.mockResolvedValue(0);

            await request(app)
                .get('/api/v1/products?categoryId=cat1')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ categoryId: 'cat1', vendorId }),
                })
            );
        });

        it('should search by name', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.product.count.mockResolvedValue(0);

            await request(app)
                .get('/api/v1/products?search=test')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        name: { contains: 'test', mode: 'insensitive' },
                        vendorId,
                    }),
                })
            );
        });

        it('should return 401 without auth', async () => {
            const res = await request(app).get('/api/v1/products');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/products/:id', () => {
        it('should return product with images (200)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'prod1',
                vendorId,
                images: [],
            });

            const res = await request(app)
                .get('/api/v1/products/prod1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('prod1');
        });

        it('should return 404 for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/v1/products/nonexistent')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should return 404 for product owned by another vendor', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'prod1',
                vendorId: 'other-vendor',
            });

            const res = await request(app)
                .get('/api/v1/products/prod1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/products', () => {
        const validProduct = {
            name: 'New Product',
            sku: 'SKU123',
            categoryId: 'cat1',
            price: 100,
            characteristics: { color: 'red' },
        };

        it('should create product successfully (201)', async () => {
            mockPrisma.product.create.mockResolvedValue({ id: 'newprod', ...validProduct });

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${token}`)
                .send(validProduct);

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('newprod');
        });

        it('should return 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Only Name' });

            expect(res.status).toBe(400);
        });

        it('should validate characteristics schema', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...validProduct, characteristics: 'invalid-string' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/v1/products/:id', () => {
        it('should update product successfully (200)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', vendorId });
            mockPrisma.product.update.mockResolvedValue({ id: 'prod1', name: 'Updated Name' });

            const res = await request(app)
                .put('/api/v1/products/prod1')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });

        it('should return 404 for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .put('/api/v1/products/nonexistent')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/v1/products/:id', () => {
        it('should soft delete product (200)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', vendorId });
            mockPrisma.product.update.mockResolvedValue({ id: 'prod1', deletedAt: new Date() });

            const res = await request(app)
                .delete('/api/v1/products/prod1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should return 404 for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/v1/products/nonexistent')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/products/:id/images', () => {
        it('should upload additional image (201)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', vendorId });
            mockPrisma.productImage.count.mockResolvedValue(0);
            mockPrisma.productImage.create.mockResolvedValue({ id: 'img1', isMain: false });

            const res = await request(app)
                .post('/api/v1/products/prod1/images')
                .set('Authorization', `Bearer ${token}`)
                .attach('image', Buffer.from('fake image'), 'test.jpg');

            expect(res.status).toBe(201);
        });

        it('should return 400 when max images exceeded (4 additional)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', vendorId });
            mockPrisma.productImage.count.mockResolvedValue(4);

            const res = await request(app)
                .post('/api/v1/products/prod1/images')
                .set('Authorization', `Bearer ${token}`)
                .attach('image', Buffer.from('fake image'), 'test.jpg');

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/v1/products/:id/images/:imageId', () => {
        it('should delete image (200)', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', vendorId });
            mockPrisma.productImage.findUnique.mockResolvedValue({
                id: 'img1',
                productId: 'prod1',
            });
            mockPrisma.productImage.delete.mockResolvedValue({ id: 'img1' });

            const res = await request(app)
                .delete('/api/v1/products/prod1/images/img1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });
});
