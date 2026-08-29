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
        expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
        expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('returns readiness only when the database responds', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
        expect((await request(app).get('/ready')).status).toBe(200);

        mockPrisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));
        expect((await request(app).get('/ready')).status).toBe(503);
    });
});
