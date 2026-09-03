import request from 'supertest';
import { app } from '../src/index';
import { generateTestToken, mockPrisma } from './setup';

jest.mock('../src/services/qrcode.service', () => ({
    QRCodeService: { generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

const vendorId = 'vendor-1';
const token = generateTestToken(vendorId);
const categoryId = '32dbce22-6db5-4e2c-9b59-06ed5460a7e3';

describe('bulk product operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.vendor.findFirst.mockResolvedValue({ id: vendorId });
        mockPrisma.category.findMany.mockResolvedValue([
            { id: categoryId, code: 'creator-merchandise', name: 'Creator Merchandise' },
        ]);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.productVersion.findMany.mockResolvedValue([]);
        mockPrisma.product.create.mockResolvedValue({ id: 'product-1' });
        mockPrisma.productVersion.create
            .mockResolvedValueOnce({ id: 'version-1' })
            .mockResolvedValueOnce({ id: 'version-2' });
        mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
        mockPrisma.productVersion.update.mockResolvedValue({ id: 'version-1' });
    });

    it('accepts the transitional single-version columns during compatibility cleanup', async () => {
        const csv = `sku,baseName,categoryId,status\nSKU-1,Imported product,${categoryId},ACTIVE`;

        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });

        expect(response.status).toBe(200);
        expect(response.body.data.imported).toBe(1);
        expect(response.body.data.importedVersions).toBe(1);
        expect(mockPrisma.product.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    vendorId,
                    vendorProfileId: vendorId,
                    status: 'ACTIVE',
                }),
            })
        );
        expect(mockPrisma.productVersion.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ label: 'Original', sku: 'SKU-1' }),
            })
        );
    });

    it('imports multiple versions and resolves a category by stable code', async () => {
        const csv = [
            'productReference,productName,categoryCode,productStatus,versionLabel,versionStatus,sku,barcode,characteristics,isPrimary',
            'drop-1,Creator Hoodie,creator-merchandise,ACTIVE,Black,ACTIVE,HOODIE-BLK,111,"[]",true',
            'drop-1,Creator Hoodie,creator-merchandise,ACTIVE,White,DRAFT,HOODIE-WHT,222,"[]",false',
        ].join('\n');

        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({
            importedProducts: 1,
            importedVersions: 2,
            failedRows: 0,
        });
        expect(mockPrisma.productVersion.create).toHaveBeenCalledTimes(2);
        expect(mockPrisma.product.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sku: 'HOODIE-BLK', barcode: '111' }),
            })
        );
    });

    it.each([
        ['missing', 'categoryCode', 'does-not-exist', 'CATEGORY_NOT_AVAILABLE'],
        ['product status', 'productStatus', 'INACTIVE', 'INVALID_PRODUCT_STATUS'],
        ['version status', 'versionStatus', 'INACTIVE', 'INVALID_VERSION_STATUS'],
        ['primary flag', 'isPrimary', 'maybe', 'INVALID_PRIMARY_FLAG'],
        ['characteristics', 'characteristics', '{}', 'INVALID_CHARACTERISTICS'],
    ])('returns a stable row error for invalid %s', async (_label, field, value, code) => {
        const row: Record<string, string> = {
            productName: 'Creator Hoodie',
            categoryCode: 'creator-merchandise',
            productStatus: 'ACTIVE',
            versionLabel: 'Original',
            versionStatus: 'ACTIVE',
            sku: 'HOODIE-1',
            characteristics: '[]',
            isPrimary: 'true',
        };
        row[field] = value;
        const headers = Object.keys(row).join(',');
        const csv = `${headers}\n${Object.values(row)
            .map((item) => JSON.stringify(item))
            .join(',')}`;

        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });

        expect(response.status).toBe(200);
        expect(response.body.data.importedProducts).toBe(0);
        expect(response.body.data.errors[0]).toMatchObject({ row: 2, code, field });
    });

    it('rejects ambiguous names and unauthorized category identifiers', async () => {
        mockPrisma.category.findMany.mockResolvedValue([
            { id: categoryId, code: 'system-creator', name: 'Creator Merchandise' },
            { id: 'vendor-category', code: null, name: 'Creator Merchandise' },
        ]);
        const ambiguous =
            'productName,categoryName,sku\nCreator Hoodie,Creator Merchandise,HOODIE-1';
        const ambiguousResponse = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(ambiguous), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });
        expect(ambiguousResponse.body.data.errors[0].code).toBe('CATEGORY_AMBIGUOUS');

        const unauthorized =
            'productName,categoryId,sku\nCreator Hoodie,other-vendor-category,HOODIE-2';
        const unauthorizedResponse = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(unauthorized), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });
        expect(unauthorizedResponse.body.data.errors[0].code).toBe('CATEGORY_NOT_AVAILABLE');
    });

    it('reports duplicate identifiers without creating a partial product', async () => {
        const csv = [
            'productReference,productName,categoryCode,versionLabel,sku,barcode,isPrimary',
            'drop-1,Creator Hoodie,creator-merchandise,Black,HOODIE-1,111,true',
            'drop-1,Creator Hoodie,creator-merchandise,White,HOODIE-1,222,false',
        ].join('\n');
        const response = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });

        expect(response.body.data.importedProducts).toBe(0);
        expect(response.body.data.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ row: 3, code: 'IDENTIFIER_CONFLICT' }),
            ])
        );
        expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('enforces the 1,000-row and 5 MB limits', async () => {
        const rows = Array.from(
            { length: 1001 },
            (_, index) => `Product ${index},creator-merchandise,SKU-${index}`
        );
        const tooManyRows = ['productName,categoryCode,sku', ...rows].join('\n');
        const rowResponse = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(tooManyRows), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });
        expect(rowResponse.status).toBe(400);
        expect(rowResponse.body.code).toBe('CSV_ROW_LIMIT_EXCEEDED');

        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const sizeResponse = await request(app)
            .post('/api/v1/products/import')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), {
                filename: 'products.csv',
                contentType: 'text/csv',
            });
        consoleError.mockRestore();
        expect(sizeResponse.status).toBe(400);
        expect(sizeResponse.body.code).toBe('UPLOAD_ERROR');
    });

    it('exports primary and secondary versions for only the authenticated vendor', async () => {
        mockPrisma.product.findMany.mockResolvedValue([
            {
                id: 'product-1',
                baseName: 'Creator Hoodie',
                status: 'ACTIVE',
                category: { code: 'creator-merchandise', name: 'Creator Merchandise' },
                versions: [
                    {
                        label: 'Black',
                        status: 'ACTIVE',
                        sku: 'HOODIE-BLK',
                        barcode: '111',
                        characteristics: [],
                        designNotes: null,
                        isPrimary: true,
                    },
                    {
                        label: 'White',
                        status: 'DRAFT',
                        sku: 'HOODIE-WHT',
                        barcode: null,
                        characteristics: [],
                        designNotes: 'Summer',
                        isPrimary: false,
                    },
                ],
            },
        ]);

        const response = await request(app)
            .get('/api/v1/products/export')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('productReference,productName,categoryCode');
        expect(response.text).toContain('HOODIE-BLK');
        expect(response.text).toContain('HOODIE-WHT');
        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { vendorProfileId: vendorId, deletedAt: null },
            })
        );
    });
});
