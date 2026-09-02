process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.BETTER_AUTH_SECRET = 'better-auth-test-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.API_PUBLIC_URL = 'http://localhost:4000';

const modelMock = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
});

export const mockPrisma = {
    vendor: modelMock(),
    user: modelMock(),
    account: modelMock(),
    session: modelMock(),
    organization: modelMock(),
    member: modelMock(),
    invitation: modelMock(),
    twoFactor: modelMock(),
    verification: modelMock(),
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

export const mockAuthApi = {
    getSession: jest.fn(),
    signInEmail: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    sendVerificationEmail: jest.fn(),
};

mockAuthApi.getSession.mockImplementation(({ headers }: { headers: Headers }) => {
    const authorization = headers.get('authorization');
    if (!authorization?.startsWith('Bearer test-session:')) return null;
    const userId = authorization.slice('Bearer test-session:'.length);
    return {
        user: { id: userId, email: `${userId}@example.test`, name: userId },
        session: {
            id: `session:${userId}`,
            userId,
            activeOrganizationId: `organization:${userId}`,
        },
    };
});

mockAuthApi.signOut.mockResolvedValue({ headers: new Headers(), response: { success: true } });
mockAuthApi.requestPasswordReset.mockResolvedValue({ status: true });
mockAuthApi.resetPassword.mockResolvedValue({ status: true });
mockAuthApi.sendVerificationEmail.mockResolvedValue({ status: true });

mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
    where.id
        ? {
              legacyVendorId: where.id,
              legacyVendor: { deletedAt: null },
          }
        : null
);

jest.mock('better-auth/node', () => ({
    fromNodeHeaders: (incoming: Record<string, string | string[] | undefined>) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming)) {
            if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
            else if (value !== undefined) headers.set(name, value);
        }
        return headers;
    },
    toNodeHandler: () => (_req: unknown, res: { status: (code: number) => { end: () => void } }) =>
        res.status(404).end(),
}));

jest.mock('better-auth/api', () => ({
    isAPIError: (error: { isBetterAuthApiError?: boolean } | null | undefined) =>
        Boolean(error?.isBetterAuthApiError),
}));

jest.mock('@inventory-system/database', () => ({
    __esModule: true,
    default: mockPrisma,
    disconnectDatabase: jest.fn(),
    ProductStatus: {
        DRAFT: 'DRAFT',
        ACTIVE: 'ACTIVE',
        DISCONTINUED: 'DISCONTINUED',
    },
    Prisma: {
        TransactionIsolationLevel: { Serializable: 'Serializable' },
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
            code = 'P2002';
        },
    },
}));

jest.mock('../src/auth', () => ({
    auth: {
        api: mockAuthApi,
        handler: jest.fn(async () => new Response(null, { status: 404 })),
    },
}));

export const generateTestToken = (vendorId: string): string => `test-session:${vendorId}`;
