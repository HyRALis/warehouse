import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.API_PUBLIC_URL = 'http://localhost:4000';

const modelMock = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
});

export const mockPrisma = {
    vendor: modelMock(),
    category: modelMock(),
    product: modelMock(),
    productVersion: modelMock(),
    productImage: modelMock(),
    characteristicTemplate: modelMock(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
};

mockPrisma.$transaction.mockImplementation((callback: (client: any) => unknown): unknown =>
    callback(mockPrisma)
);

jest.mock('@inventory-system/database', () => ({
    __esModule: true,
    default: mockPrisma,
    ProductStatus: {
        DRAFT: 'DRAFT',
        ACTIVE: 'ACTIVE',
        DISCONTINUED: 'DISCONTINUED',
    },
    Prisma: {
        TransactionIsolationLevel: { Serializable: 'Serializable' },
    },
}));

export const generateTestToken = (vendorId: string, tokenVersion = 0) => {
    return jwt.sign({ id: vendorId, tokenVersion }, process.env.JWT_SECRET as string, {
        expiresIn: '1h',
    });
};
