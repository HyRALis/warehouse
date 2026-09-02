import prisma from '../src/index.js';

async function main(): Promise<void> {
    const [vendors, migratedUsers, credentialAccounts, organizations, ownerMembers, legacyResets] =
        await Promise.all([
            prisma.vendor.count(),
            prisma.user.count({ where: { legacyVendorId: { not: null } } }),
            prisma.account.count({ where: { issuer: 'local:credential', providerId: 'credential' } }),
            prisma.organization.count(),
            prisma.member.count({ where: { role: 'owner' } }),
            prisma.vendor.count({
                where: {
                    OR: [
                        { passwordResetTokenHash: { not: null } },
                        { passwordResetExpiresAt: { not: null } },
                    ],
                },
            }),
        ]);

    const expectedCounts = [migratedUsers, credentialAccounts, organizations, ownerMembers];
    if (expectedCounts.some((count) => count !== vendors)) {
        throw new Error(
            `Better Auth migration mismatch: vendors=${vendors}, users=${migratedUsers}, accounts=${credentialAccounts}, organizations=${organizations}, owners=${ownerMembers}`
        );
    }
    if (legacyResets !== 0) {
        throw new Error(`Better Auth migration left ${legacyResets} legacy reset token(s)`);
    }

    console.log(
        `Better Auth migration verified: ${vendors} Vendor identities, credential accounts, organizations, and Owner memberships.`
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
