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
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
});

export const mockPrisma = {
    user: modelMock(),
    account: modelMock(),
    session: modelMock(),
    organization: modelMock(),
    member: modelMock(),
    portal: modelMock(),
    organizationPortalSubscription: modelMock(),
    memberPortalAccess: modelMock(),
    vendorProfile: modelMock(),
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

mockPrisma.member.findUnique.mockImplementation(
    ({
        where,
    }: {
        where: { organizationId_userId?: { organizationId: string; userId: string } };
    }) => {
        const key = where.organizationId_userId;
        return key
            ? {
                  id: `member:${key.userId}`,
                  organizationId: key.organizationId,
                  role: 'owner',
              }
            : null;
    }
);
mockPrisma.organizationPortalSubscription.findUnique.mockResolvedValue({
    status: 'ACTIVE',
    startsAt: new Date('2020-01-01T00:00:00.000Z'),
    endsAt: null,
});
mockPrisma.memberPortalAccess.findUnique.mockResolvedValue({ enabled: true });
mockPrisma.vendorProfile.findUnique.mockImplementation(
    ({ where }: { where: { organizationId_profileKey?: { organizationId: string } } }) => {
        const organizationId = where.organizationId_profileKey?.organizationId;
        const vendorId = organizationId?.startsWith('organization:')
            ? organizationId.slice('organization:'.length)
            : undefined;
        return vendorId ? { id: vendorId, deletedAt: null } : null;
    }
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
        sql: (strings: TemplateStringsArray) => strings.join(' '),
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
