import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);
const templateId = 'e5a99c9c-939c-4aa4-ad30-f8dfe099bd97';

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
            expect.objectContaining({
                where: { OR: [{ vendorProfileId: null }, { vendorProfileId: vendorId }] },
            })
        );
    });

    it('allows reading and duplicating a system template without mutating it', async () => {
        const systemTemplate = {
            id: templateId,
            vendorId: null,
            vendorProfileId: null,
            name: 'Apparel',
            fields: [{ name: 'Material' }],
        };
        mockPrisma.characteristicTemplate.findFirst.mockResolvedValue(systemTemplate);
        mockPrisma.characteristicTemplate.create.mockResolvedValue({
            ...systemTemplate,
            id: 'copy-1',
            vendorId,
            name: 'Creator Apparel',
        });

        const response = await request(app)
            .post(`/api/v1/templates/${templateId}/duplicate`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Creator Apparel' });

        expect(response.status).toBe(201);
        expect(mockPrisma.characteristicTemplate.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                vendorId,
                vendorProfileId: vendorId,
                name: 'Creator Apparel',
                fields: systemTemplate.fields,
            }),
        });
        expect(mockPrisma.characteristicTemplate.update).not.toHaveBeenCalled();
    });

    it('denies updates to system templates', async () => {
        mockPrisma.characteristicTemplate.findUnique.mockResolvedValue({
            id: templateId,
            vendorId: null,
            vendorProfileId: null,
        });

        const response = await request(app)
            .put(`/api/v1/templates/${templateId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Changed' });

        expect(response.status).toBe(403);
        expect(mockPrisma.characteristicTemplate.update).not.toHaveBeenCalled();
    });

    it('prevents deleting a custom template used by categories', async () => {
        mockPrisma.characteristicTemplate.findUnique.mockResolvedValue({
            id: templateId,
            vendorId,
            vendorProfileId: vendorId,
        });
        mockPrisma.category.count.mockResolvedValue(3);

        const response = await request(app)
            .delete(`/api/v1/templates/${templateId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(409);
        expect(response.body).toMatchObject({ code: 'TEMPLATE_IN_USE' });
        expect(mockPrisma.characteristicTemplate.delete).not.toHaveBeenCalled();
    });
});
