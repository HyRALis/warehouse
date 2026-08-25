import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);
const categoryId = '32dbce22-6db5-4e2c-9b59-06ed5460a7e3';

describe('categories', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
    });

    it('lists only system and current-vendor categories', async () => {
        mockPrisma.category.findMany.mockResolvedValue([]);

        const response = await request(app)
            .get('/api/v1/categories')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { OR: [{ vendorId: null }, { vendorId }] } })
        );
    });

    it('rejects a parent category owned by another vendor', async () => {
        mockPrisma.category.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Child', parentId: categoryId });

        expect(response.status).toBe(400);
        expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it('forbids editing a system category or another vendor’s category', async () => {
        mockPrisma.category.findUnique.mockResolvedValue({ id: categoryId, vendorId: null });

        const response = await request(app)
            .put(`/api/v1/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Changed' });

        expect(response.status).toBe(403);
        expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });
});
