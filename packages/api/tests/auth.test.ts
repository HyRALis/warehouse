import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

jest.mock('bcryptjs');

const vendor = {
    id: 'vendor-1',
    email: 'owner@example.com',
    passwordHash: 'hashed-password',
    companyName: 'Example Supply',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    tokenVersion: 0,
};

describe('authentication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('registers a vendor, sets an HttpOnly cookie, and does not expose the JWT', async () => {
        mockPrisma.vendor.findUnique.mockResolvedValue(null);
        mockPrisma.vendor.create.mockResolvedValue(vendor);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

        const response = await request(app).post('/api/v1/auth/register').send({
            email: vendor.email,
            password: 'a-secure-password',
            companyName: vendor.companyName,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.vendor.id).toBe(vendor.id);
        expect(response.body.data.token).toBeUndefined();
        expect(response.headers['set-cookie'][0]).toContain('vendor_session=');
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('rejects invalid credentials without revealing whether the account exists', async () => {
        mockPrisma.vendor.findFirst.mockResolvedValue(vendor);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const response = await request(app).post('/api/v1/auth/login').send({
            email: vendor.email,
            password: 'incorrect-password',
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('revokes all current sessions and clears the cookie on logout', async () => {
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendor.id });
        mockPrisma.vendor.update.mockResolvedValue({ ...vendor, tokenVersion: 1 });

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${generateTestToken(vendor.id)}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.vendor.update).toHaveBeenCalledWith({
            where: { id: vendor.id },
            data: { tokenVersion: { increment: 1 } },
        });
        expect(response.headers['set-cookie'][0]).toContain('vendor_session=;');
    });

    it('rejects a signed token when its session version is no longer valid', async () => {
        mockPrisma.vendor.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${generateTestToken(vendor.id)}`);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('INVALID_SESSION');
    });

    it('resets a password only with a live hashed reset token', async () => {
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendor.id });
        mockPrisma.vendor.update.mockResolvedValue(vendor);
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

        const response = await request(app).post('/api/v1/auth/reset-password').send({
            token: 'valid-reset-token-that-is-more-than-thirty-two-characters',
            password: 'new-secure-password',
        });

        expect(response.status).toBe(200);
        expect(mockPrisma.vendor.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: vendor.id },
                data: expect.objectContaining({
                    passwordResetTokenHash: null,
                    passwordResetExpiresAt: null,
                    tokenVersion: { increment: 1 },
                }),
            })
        );
    });
});
