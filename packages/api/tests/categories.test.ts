import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma, generateTestToken } from './setup';

describe('Category Endpoints', () => {
  let token: string;
  const vendorId = 'vendor123';

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateTestToken(vendorId);
  });

  describe('GET /api/v1/categories', () => {
    it('should return system + vendor categories (200)', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'sys1', vendorId: null },
        { id: 'ven1', vendorId },
      ]);

      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should create custom category (201)', async () => {
      mockPrisma.category.create.mockResolvedValue({
        id: 'newcat',
        name: 'Custom',
        vendorId,
      });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Custom' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('newcat');
    });

    it('should create with parentId (201)', async () => {
      mockPrisma.category.create.mockResolvedValue({
        id: 'subcat',
        name: 'Sub',
        parentId: 'parentcat',
        vendorId,
      });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sub', parentId: 'parentcat' });

      expect(res.status).toBe(201);
      expect(res.body.parentId).toBe('parentcat');
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it("should update vendor's own category (200)", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat1', vendorId });
      mockPrisma.category.update.mockResolvedValue({ id: 'cat1', name: 'Updated' });

      const res = await request(app)
        .put('/api/v1/categories/cat1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('should return 403 when editing system category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'syscat', vendorId: null });

      const res = await request(app)
        .put('/api/v1/categories/syscat')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Malicious Update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should delete category (200)', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat1', vendorId });
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue({ id: 'cat1' });

      const res = await request(app)
        .delete('/api/v1/categories/cat1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 400 when category has products', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat1', vendorId });
      mockPrisma.product.count.mockResolvedValue(5);

      const res = await request(app)
        .delete('/api/v1/categories/cat1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
