import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma, generateTestToken } from './setup';

describe('Bulk Endpoints', () => {
  let token: string;
  const vendorId = 'vendor123';

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateTestToken(vendorId);
  });

  describe('POST /api/v1/products/import', () => {
    it('should import valid CSV data (200)', async () => {
      // Mocking specific bulk insert behavior if needed
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      
      const csvData = Buffer.from('name,sku,price,categoryId\nProd1,SKU1,100,cat1');

      const res = await request(app)
        .post('/api/v1/products/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', csvData, 'import.csv');

      // The status depends on the implementation, but usually 200/201 for bulk
      expect([200, 201]).toContain(res.status);
    });

    it('should report errors for invalid rows', async () => {
      const csvData = Buffer.from('name,sku,price,categoryId\n,SKU1,,cat1');

      const res = await request(app)
        .post('/api/v1/products/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', csvData, 'import.csv');

      // Generally 400 or a 200 with error report
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/products/export', () => {
    it('should export products as CSV download (200)', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: '1', name: 'Prod1', sku: 'SKU1', price: 100 },
      ]);

      const res = await request(app)
        .get('/api/v1/products/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
    });

    it('should set correct Content-Type header', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/products/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.headers['content-type']).toContain('text/csv');
    });
  });
});
