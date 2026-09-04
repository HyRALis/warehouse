import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

const vendorId = 'vendor-search-1';
const token = generateTestToken(vendorId);
const mockSearchRows = (rows: unknown[], literalMatch = true) => {
    mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ found: literalMatch }])
        .mockResolvedValueOnce(rows);
};

describe('universal search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
        mockPrisma.$queryRaw.mockResolvedValue([]);
    });

    it('requires an authenticated vendor', async () => {
        const response = await request(app).get('/api/v1/search?q=hoodie');

        expect(response.status).toBe(401);
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('rejects empty, oversized, and unsupported queries', async () => {
        const empty = await request(app)
            .get('/api/v1/search?q=')
            .set('Authorization', `Bearer ${token}`);
        const oversized = await request(app)
            .get(`/api/v1/search?q=${'a'.repeat(101)}`)
            .set('Authorization', `Bearer ${token}`);
        const unsupported = await request(app)
            .get('/api/v1/search?q=hoodie&types=vendor')
            .set('Authorization', `Bearer ${token}`);
        const emptyType = await request(app)
            .get('/api/v1/search?q=hoodie&types=product,,version')
            .set('Authorization', `Bearer ${token}`);

        expect(empty.status).toBe(400);
        expect(oversized.status).toBe(400);
        expect(unsupported.status).toBe(400);
        expect(emptyType.status).toBe(400);
    });

    it('returns grouped suggestions with version context and exact identifier ranking', async () => {
        mockSearchRows([
            {
                type: 'version',
                id: 'version-1',
                title: 'Summer Drop',
                subtitle: 'Creator Hoodie · HOODIE-SUMMER',
                href: '/dashboard/products/product-1?version=version-1',
                score: 1300,
                matchedField: 'barcode',
                context: {
                    productId: 'product-1',
                    productName: 'Creator Hoodie',
                    sku: 'HOODIE-SUMMER',
                    barcode: '12345',
                    status: 'ACTIVE',
                },
                totalCount: BigInt(2),
            },
            {
                type: 'product',
                id: 'product-1',
                title: 'Creator Hoodie',
                subtitle: 'HOODIE-ORIGINAL · Hoodies',
                href: '/dashboard/products/product-1',
                score: '1200',
                matchedField: 'sku',
                context: { sku: 'HOODIE-ORIGINAL', status: 'ACTIVE' },
                totalCount: BigInt(2),
            },
        ]);

        const response = await request(app)
            .get('/api/v1/search?q=12345')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(2);
        expect(response.body.groups[0]).toMatchObject({
            type: 'product',
            label: 'Products',
        });
        expect(response.body.groups[1].results[0]).toMatchObject({
            type: 'version',
            matchedField: 'barcode',
            context: { productId: 'product-1', productName: 'Creator Hoodie' },
        });
    });

    it('supports URL-persistable type filters and paginated results', async () => {
        mockSearchRows([
            {
                type: 'category',
                id: 'category-1',
                title: 'Hoodies',
                subtitle: 'Clothing / Hoodies',
                href: '/dashboard/categories?category=category-1',
                score: 1100,
                matchedField: 'alias',
                context: {
                    categoryCode: 'clothing.hoodies',
                    breadcrumb: 'Clothing / Hoodies',
                    ownership: 'system',
                },
                totalCount: 21,
            },
        ]);

        const response = await request(app)
            .get('/api/v1/search?q=sweatshirt&mode=results&types=category,template&page=2&limit=10')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            query: 'sweatshirt',
            mode: 'results',
            total: 21,
            page: 2,
            limit: 10,
            totalPages: 3,
        });

        const queryValues = mockPrisma.$queryRaw.mock.calls[1].slice(1);
        const queryText = mockPrisma.$queryRaw.mock.calls[1][0].join(' ');
        expect(queryValues).toContain(vendorId);
        expect(queryText).toContain('p.vendor_profile_id');
        expect(queryText).toContain('pv.vendor_profile_id');
        expect(queryText).toContain('c.vendor_profile_id');
        expect(queryText).toContain('t.vendor_profile_id');
        expect(queryText).toContain('AND p.vendor_profile_id');
        expect(queryText).toContain('pc.vendor_profile_id IS NULL');
        expect(queryValues).toContain(false);
        expect(queryValues).toContain(true);
        expect(queryValues).toContain(10);
    });

    it('preserves the total when a requested page has no rows', async () => {
        mockSearchRows([
            {
                type: null,
                id: null,
                title: null,
                subtitle: null,
                href: null,
                score: null,
                matchedField: null,
                context: null,
                totalCount: BigInt(11),
            },
        ]);

        const response = await request(app)
            .get('/api/v1/search?q=hoodie&mode=results&page=3&limit=5')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            data: [],
            total: 11,
            page: 3,
            totalPages: 3,
        });
    });

    it('surfaces template field matches and system ownership', async () => {
        mockSearchRows([
            {
                type: 'template',
                id: 'template-1',
                title: 'Apparel basics',
                subtitle: 'System template',
                href: '/dashboard/templates?template=template-1',
                score: 720,
                matchedField: 'field name',
                context: { ownership: 'system' },
                totalCount: 1,
            },
        ]);

        const response = await request(app)
            .get('/api/v1/search?q=material&types=template')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0]).toMatchObject({
            type: 'template',
            matchedField: 'field name',
            context: { ownership: 'system' },
        });
    });

    it('uses fuzzy trigram candidates only when the literal probe is empty', async () => {
        mockSearchRows([], false);

        const response = await request(app)
            .get('/api/v1/search?q=hodie')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
        expect(mockPrisma.$queryRaw.mock.calls[1].slice(1)).toEqual(
            expect.arrayContaining([expect.stringContaining('search_text %')])
        );
    });
});
