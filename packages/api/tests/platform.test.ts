import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma } from './setup';

describe('platform probes and request context', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns liveness with a request ID', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
        expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('returns readiness only when the database responds', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
        expect((await request(app).get('/ready')).status).toBe(200);

        mockPrisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));
        expect((await request(app).get('/ready')).status).toBe(503);
    });

    it('returns a rate-limited public invitation summary without requiring a session', async () => {
        mockPrisma.invitation.findUnique.mockResolvedValue({
            id: 'invitation-1',
            email: 'member@example.test',
            organizationId: 'organization-1',
            role: 'member',
            status: 'pending',
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            organization: { name: 'Example Organization' },
            user: { email: 'owner@example.test' },
        });

        const response = await request(app).get('/api/v1/platform/invitations/invitation-1');

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            id: 'invitation-1',
            email: 'member@example.test',
            organizationName: 'Example Organization',
            inviterEmail: 'owner@example.test',
            status: 'pending',
        });
        expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
            where: { id: 'invitation-1' },
            select: expect.objectContaining({ id: true, email: true, status: true }),
        });
    });

    it('does not disclose anything for an unknown invitation identifier', async () => {
        mockPrisma.invitation.findUnique.mockResolvedValue(null);

        const response = await request(app).get('/api/v1/platform/invitations/unknown');

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
            success: false,
            code: 'INVITATION_NOT_FOUND',
        });
    });
});
