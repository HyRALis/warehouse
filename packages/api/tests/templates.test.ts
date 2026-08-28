import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);

describe('templates', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
    });

    it('lists system templates and templates owned by the authenticated vendor', async () => {
        mockPrisma.characteristicTemplate.findMany.mockResolvedValue([]);

        const response = await request(app)
            .get('/api/v1/templates')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.characteristicTemplate.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { OR: [{ vendorId: null }, { vendorId }] } })
        );
    });
});
