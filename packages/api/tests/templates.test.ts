import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma, generateTestToken } from './setup';

describe('Template Endpoints', () => {
    let token: string;
    const vendorId = 'vendor123';

    beforeEach(() => {
        jest.clearAllMocks();
        token = generateTestToken(vendorId);
    });

    describe('GET /api/v1/templates', () => {
        it("should return vendor's templates (200)", async () => {
            mockPrisma.characteristicTemplate.findMany.mockResolvedValue([{ id: 't1', vendorId }]);

            const res = await request(app)
                .get('/api/v1/templates')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('GET /api/v1/templates/:id', () => {
        it('should return single template (200)', async () => {
            mockPrisma.characteristicTemplate.findUnique.mockResolvedValue({ id: 't1', vendorId });

            const res = await request(app)
                .get('/api/v1/templates/t1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('t1');
        });

        it('should return 404 for non-existent template', async () => {
            mockPrisma.characteristicTemplate.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/v1/templates/nonexistent')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/templates', () => {
        const validTemplate = {
            name: 'Shirt Characteristics',
            fields: [{ name: 'size', type: 'string', required: true }],
        };

        it('should create template (201)', async () => {
            mockPrisma.characteristicTemplate.create.mockResolvedValue({
                id: 'new_t',
                ...validTemplate,
                vendorId,
            });

            const res = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${token}`)
                .send(validTemplate);

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('new_t');
        });

        it('should validate fields structure', async () => {
            const res = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Bad', fields: 'not-an-array' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/v1/templates/:id', () => {
        it('should update template (200)', async () => {
            mockPrisma.characteristicTemplate.findUnique.mockResolvedValue({ id: 't1', vendorId });
            mockPrisma.characteristicTemplate.update.mockResolvedValue({
                id: 't1',
                name: 'Updated',
            });

            const res = await request(app)
                .put('/api/v1/templates/t1')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/v1/templates/:id', () => {
        it('should delete template (200)', async () => {
            mockPrisma.characteristicTemplate.findUnique.mockResolvedValue({ id: 't1', vendorId });
            mockPrisma.characteristicTemplate.delete.mockResolvedValue({ id: 't1' });

            const res = await request(app)
                .delete('/api/v1/templates/t1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });
});
