import request from 'supertest';
import { app } from '../src/index';
import { mockPrisma, generateTestToken } from './setup';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test Vendor',
    };

    it('should register a new vendor successfully (201)', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrisma.vendor.create.mockResolvedValue({
        id: '123',
        email: validRegisterData.email,
        name: validRegisterData.name,
      });

      const res = await request(app).post('/api/v1/auth/register').send(validRegisterData);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', '123');
    });

    it('should return 409 if email already exists', async () => {
      mockPrisma.vendor.create.mockRejectedValue({ code: 'P2002' }); // Prisma unique constraint code

      const res = await request(app).post('/api/v1/auth/register').send(validRegisterData);
      
      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        ...validRegisterData,
        email: 'invalid-email',
      });
      
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockVendor = {
      id: '123',
      email: 'test@example.com',
      password: 'hashedpassword',
      deletedAt: null,
    };

    it('should login successfully with correct credentials (200)', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app).post('/api/v1/auth/login').send(validLoginData);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for wrong password', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app).post('/api/v1/auth/login').send(validLoginData);
      
      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent email', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/v1/auth/login').send(validLoginData);
      
      expect(res.status).toBe(401);
    });

    it('should return 401 for soft-deleted vendor', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({
        ...mockVendor,
        deletedAt: new Date(),
      });

      const res = await request(app).post('/api/v1/auth/login').send(validLoginData);
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current vendor profile (200)', async () => {
      const token = generateTestToken('123');
      mockPrisma.vendor.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        name: 'Test Vendor',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return success (200)', async () => {
      const token = generateTestToken('123');
      
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });
});
