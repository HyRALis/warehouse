import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);

describe('vendor settings contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('updates User, Organization, and Vendor Profile at PUT /vendors/me', async () => {
        mockPrisma.user.update.mockResolvedValue({ email: 'owner@example.com' });
        mockPrisma.organization.update.mockResolvedValue({ id: `organization:${vendorId}` });
        mockPrisma.vendorProfile.update.mockResolvedValue({
            id: vendorId,
            displayName: 'Updated Supply',
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

    it('deactivates the Organization Vendor Portal and revokes its sessions', async () => {
        mockPrisma.vendorProfile.update.mockResolvedValue({ id: vendorId });
        mockPrisma.organizationPortalSubscription.update.mockResolvedValue({ id: 'subscription' });
        mockPrisma.memberPortalAccess.updateMany.mockResolvedValue({ count: 1 });

        const response = await request(app)
            .delete('/api/v1/vendors/me')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.vendorProfile.update).toHaveBeenCalledWith({
            where: { id: vendorId },
            data: { deletedAt: expect.any(Date) },
        });
        expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
            where: { activeOrganizationId: `organization:${vendorId}` },
        });
        expect(mockPrisma.verification.deleteMany).toHaveBeenCalledWith({
            where: { value: vendorId },
        });
    });
});
