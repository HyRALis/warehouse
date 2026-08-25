import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);

describe('vendor settings contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
    });

    it('updates the current vendor at PUT /vendors/me', async () => {
        mockPrisma.vendor.update.mockResolvedValue({
            id: vendorId,
            email: 'owner@example.com',
            companyName: 'Updated Supply',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const response = await request(app)
            .put('/api/v1/vendors/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ companyName: 'Updated Supply' });

        expect(response.status).toBe(200);
        expect(response.body.data.companyName).toBe('Updated Supply');
    });

    it('deactivates the current vendor and revokes sessions at DELETE /vendors/me', async () => {
        mockPrisma.vendor.update.mockResolvedValue({ id: vendorId });

        const response = await request(app)
            .delete('/api/v1/vendors/me')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.vendor.update).toHaveBeenCalledWith({
            where: { id: vendorId },
            data: { deletedAt: expect.any(Date), tokenVersion: { increment: 1 } },
        });
    });
});
