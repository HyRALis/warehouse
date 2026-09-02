import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockAuthApi, mockPrisma } from './setup';
import {
    createVendorProfile,
    VendorProfileCreationError,
} from '../src/services/vendor-profile.service';

const userId = 'vendor-1';
const organizationId = `organization:${userId}`;
const memberId = `member:${userId}`;
const token = generateTestToken(userId);

const activeSubscription = () => ({
    status: 'ACTIVE',
    startsAt: new Date('2020-01-01T00:00:00.000Z'),
    endsAt: null,
});

describe('Vendor Portal entitlements', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({
            legacyVendorId: userId,
            legacyVendor: { deletedAt: null },
        });
        mockPrisma.member.findUnique.mockResolvedValue({
            id: memberId,
            organizationId,
            role: 'owner',
        });
        mockPrisma.organizationPortalSubscription.findUnique.mockResolvedValue(
            activeSubscription()
        );
        mockPrisma.memberPortalAccess.findUnique.mockResolvedValue({ enabled: true });
        mockPrisma.vendorProfile.findUnique.mockResolvedValue({
            id: userId,
            legacyVendorId: userId,
            deletedAt: null,
        });
        mockPrisma.product.count.mockResolvedValue(0);
        mockPrisma.product.findMany.mockResolvedValue([]);
    });

    it('gives Owners implicit access when the Organization subscription is active', async () => {
        mockPrisma.memberPortalAccess.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ vendorProfileId: userId }),
            })
        );
    });

    it('requires explicit Vendor Portal access for a non-Owner member', async () => {
        mockPrisma.member.findUnique.mockResolvedValue({
            id: memberId,
            organizationId,
            role: 'member',
        });
        mockPrisma.memberPortalAccess.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('VENDOR_PORTAL_ACCESS_DENIED');
        expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });

    it('scopes an invited Member through the Organization profile, not a personal Vendor record', async () => {
        mockAuthApi.getSession.mockResolvedValueOnce({
            user: { id: 'invited-user', email: 'invited@example.test', name: 'Invited User' },
            session: {
                id: 'session:invited-user',
                userId: 'invited-user',
                activeOrganizationId: organizationId,
            },
        });
        mockPrisma.user.findUnique.mockResolvedValueOnce({
            legacyVendorId: null,
            legacyVendor: null,
        });
        mockPrisma.member.findUnique.mockResolvedValueOnce({
            id: 'member:invited-user',
            organizationId,
            role: 'member',
        });
        mockPrisma.vendorProfile.findUnique.mockResolvedValueOnce({
            id: userId,
            legacyVendorId: userId,
            deletedAt: null,
        });

        const response = await request(app)
            .get('/api/v1/products')
            .set('Authorization', 'Bearer invited-session');

        expect(response.status).toBe(200);
        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ vendorProfileId: userId }),
            })
        );
    });

    it('does not let an entitled Member mutate the Organization Vendor Profile', async () => {
        mockPrisma.member.findUnique.mockResolvedValue({
            id: memberId,
            organizationId,
            role: 'member',
        });

        const response = await request(app)
            .put('/api/v1/vendors/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ companyName: 'Unauthorized rename' });

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('OWNER_REQUIRED');
        expect(mockPrisma.vendor.update).not.toHaveBeenCalled();
    });

    it('lets an Owner update producer-facing Vendor Profile fields transactionally', async () => {
        mockPrisma.vendorProfile.update.mockResolvedValue({
            id: userId,
            organizationId,
            profileKey: 'primary',
            displayName: 'Updated Producer',
            description: 'Independent producer',
            websiteUrl: 'https://producer.example',
            logoUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const response = await request(app)
            .put('/api/v1/platform/vendor-profile')
            .set('Authorization', `Bearer ${token}`)
            .send({
                displayName: 'Updated Producer',
                description: 'Independent producer',
                websiteUrl: 'https://producer.example',
            });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            profileKey: 'primary',
            displayName: 'Updated Producer',
            description: 'Independent producer',
        });
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockPrisma.vendor.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { companyName: 'Updated Producer' },
        });
    });

    it('blocks every catalog query while the subscription is suspended', async () => {
        mockPrisma.organizationPortalSubscription.findUnique.mockResolvedValue({
            ...activeSubscription(),
            status: 'SUSPENDED',
        });

        const response = await request(app)
            .get('/api/v1/categories')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('VENDOR_SUBSCRIPTION_INACTIVE');
        expect(mockPrisma.category.findMany).not.toHaveBeenCalled();
    });

    it('denies an explicitly requested Vendor Profile outside the active Organization', async () => {
        const response = await request(app)
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Vendor-Profile-Id', 'another-profile');

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('VENDOR_PROFILE_ACCESS_DENIED');
    });

    it('returns subscription and implicit-access state even when portal entry is suspended', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue({
            id: organizationId,
            name: 'Example Organization',
            slug: 'example-organization',
            logo: null,
        });
        mockPrisma.organizationPortalSubscription.findUnique.mockResolvedValue({
            ...activeSubscription(),
            status: 'SUSPENDED',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mockPrisma.vendorProfile.findUnique.mockResolvedValue({
            id: userId,
            profileKey: 'primary',
            displayName: 'Example Vendor',
            description: null,
            websiteUrl: null,
            logoUrl: null,
            deletedAt: null,
        });

        const response = await request(app)
            .get('/api/v1/platform/context')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.portal.subscription).toMatchObject({
            status: 'SUSPENDED',
            active: false,
        });
        expect(response.body.data.portal.access).toMatchObject({
            granted: true,
            implicit: true,
        });
    });

    it('lets an Owner grant or revoke only a Member in the active Organization', async () => {
        mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-2', role: 'member' });
        mockPrisma.memberPortalAccess.upsert.mockResolvedValue({
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const response = await request(app)
            .put('/api/v1/platform/vendor/members/member-2/access')
            .set('Authorization', `Bearer ${token}`)
            .send({ enabled: false });

        expect(response.status).toBe(200);
        expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
            where: { id: 'member-2', organizationId },
            select: { id: true, role: true },
        });
        expect(mockPrisma.memberPortalAccess.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    memberId: 'member-2',
                    enabled: false,
                    grantedByUserId: userId,
                }),
            })
        );
    });

    it('does not allow explicit access changes for an Owner', async () => {
        mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-owner', role: 'owner' });

        const response = await request(app)
            .put('/api/v1/platform/vendor/members/member-owner/access')
            .set('Authorization', `Bearer ${token}`)
            .send({ enabled: false });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('OWNER_ACCESS_IMPLICIT');
        expect(mockPrisma.memberPortalAccess.upsert).not.toHaveBeenCalled();
    });

    it('rejects non-primary or duplicate Vendor Profile creation at the service boundary', async () => {
        await expect(
            createVendorProfile(mockPrisma as never, {
                organizationId,
                profileKey: 'secondary',
                displayName: 'Secondary',
            })
        ).rejects.toMatchObject<Partial<VendorProfileCreationError>>({
            code: 'PRIMARY_PROFILE_ONLY',
        });

        mockPrisma.vendorProfile.findUnique.mockResolvedValueOnce({ id: userId });
        await expect(
            createVendorProfile(mockPrisma as never, {
                organizationId,
                profileKey: 'primary',
                displayName: 'Duplicate',
            })
        ).rejects.toMatchObject<Partial<VendorProfileCreationError>>({
            code: 'PRIMARY_PROFILE_EXISTS',
        });

        mockPrisma.vendorProfile.findUnique.mockResolvedValueOnce(null);
        mockPrisma.vendorProfile.create.mockRejectedValueOnce({ code: 'P2002' });
        await expect(
            createVendorProfile(mockPrisma as never, {
                organizationId,
                profileKey: 'primary',
                displayName: 'Concurrent Duplicate',
            })
        ).rejects.toMatchObject<Partial<VendorProfileCreationError>>({
            code: 'PRIMARY_PROFILE_EXISTS',
        });
    });
});
