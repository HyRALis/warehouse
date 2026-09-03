import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockAuthApi, mockPrisma } from './setup';
import {
    hashPassword,
    isLegacyBcryptHash,
} from '../src/services/password.service';

jest.mock('../src/services/password.service', () => ({
    hashPassword: jest.fn(),
    isLegacyBcryptHash: jest.fn(),
    verifyPassword: jest.fn(),
}));

const vendor = {
    id: 'vendor-1',
    email: 'owner@example.com',
    passwordHash: '$2b$12$legacy-password-hash',
    companyName: 'Example Supply',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    tokenVersion: 0,
};

const authHeaders = (): Headers => {
    const headers = new Headers();
    headers.append(
        'set-cookie',
        'better-auth.session_token=session-token; Path=/; HttpOnly; SameSite=Lax'
    );
    return headers;
};

describe('Better Auth compatibility facade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (hashPassword as jest.Mock).mockResolvedValue('scrypt$new-password-hash');
        (isLegacyBcryptHash as jest.Mock).mockReturnValue(false);
        mockAuthApi.signInEmail.mockResolvedValue({
            headers: authHeaders(),
            response: { user: { id: 'user-1' }, token: 'not-returned' },
        });
        mockAuthApi.signOut.mockResolvedValue({
            headers: authHeaders(),
            response: { success: true },
        });
        mockAuthApi.requestPasswordReset.mockResolvedValue({ status: true });
        mockAuthApi.resetPassword.mockResolvedValue({ status: true });
        mockAuthApi.sendVerificationEmail.mockResolvedValue({ status: true });
    });

    it('creates identity, organization, owner membership, and legacy Vendor atomically', async () => {
        mockPrisma.vendor.create.mockResolvedValue(vendor);
        mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
        mockPrisma.account.create.mockResolvedValue({ id: 'account-1' });
        mockPrisma.organization.create.mockResolvedValue({ id: 'organization-1' });
        mockPrisma.member.create.mockResolvedValue({ id: 'member-1' });

        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'Owner@Example.com',
            password: 'a-secure-password',
            companyName: vendor.companyName,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.vendor.id).toBe(vendor.id);
        expect(response.body.data.token).toBeUndefined();
        expect(response.headers['set-cookie'][0]).toContain('better-auth.session_token=');
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
        expect(mockPrisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    email: vendor.email,
                    emailVerified: false,
                    legacyVendorId: expect.any(String),
                }),
            })
        );
        expect(mockPrisma.member.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ role: 'owner' }) })
        );
        expect(mockAuthApi.signInEmail).toHaveBeenCalled();
        expect(mockAuthApi.sendVerificationEmail).toHaveBeenCalled();
    });

    it('upgrades a migrated bcrypt credential after the first successful login', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 'user-1',
            legacyVendor: vendor,
            accounts: [{ id: 'account-1', password: vendor.passwordHash }],
        });
        (isLegacyBcryptHash as jest.Mock).mockReturnValue(true);

        const response = await request(app).post('/api/v1/auth/login').send({
            email: vendor.email,
            password: 'correct-password',
        });

        expect(response.status).toBe(200);
        expect(response.body.data.vendor.id).toBe(vendor.id);
        expect(mockPrisma.account.update).toHaveBeenCalledWith({
            where: { id: 'account-1' },
            data: { password: 'scrypt$new-password-hash' },
        });
    });

    it('rejects invalid credentials without revealing whether the account exists', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(app).post('/api/v1/auth/login').send({
            email: vendor.email,
            password: 'incorrect-password',
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('revokes the current Better Auth session and clears its cookie on logout', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            legacyVendorId: vendor.id,
            legacyVendor: { deletedAt: null },
        });

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${generateTestToken(vendor.id)}`);

        expect(response.status).toBe(200);
        expect(mockAuthApi.signOut).toHaveBeenCalled();
        expect(response.headers['set-cookie'][0]).toContain('better-auth.session_token=');
    });

    it('rejects a request when Better Auth has no database session', async () => {
        mockAuthApi.getSession.mockResolvedValueOnce(null);

        const response = await request(app).get('/api/v1/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('delegates password reset to Better Auth verification records', async () => {
        const response = await request(app).post('/api/v1/auth/reset-password').send({
            token: 'valid-reset-token-that-is-more-than-thirty-two-characters',
            password: 'new-secure-password',
        });

        expect(response.status).toBe(200);
        expect(mockAuthApi.resetPassword).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ newPassword: 'new-secure-password' }),
            })
        );
    });
});
