import prisma from '../src/index.js';

async function main(): Promise<void> {
    const [
        users,
        organizations,
        ownerMembers,
        organizationsWithoutOwner,
        usersWithoutCredential,
        usersWithoutMembership,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.member.count({ where: { role: 'owner' } }),
        prisma.organization.count({ where: { members: { none: { role: 'owner' } } } }),
        prisma.user.count({
            where: {
                accounts: {
                    none: {
                        issuer: 'local:credential',
                        providerId: 'credential',
                        password: { not: null },
                    },
                },
            },
        }),
        prisma.user.count({ where: { members: { none: {} } } }),
    ]);

    if (
        organizationsWithoutOwner !== 0 ||
        usersWithoutCredential !== 0 ||
        usersWithoutMembership !== 0
    ) {
        throw new Error(
            `Better Auth identity mismatch: users=${users}, organizations=${organizations}, owners=${ownerMembers}, organizationsWithoutOwner=${organizationsWithoutOwner}, usersWithoutCredential=${usersWithoutCredential}, usersWithoutMembership=${usersWithoutMembership}`
        );
    }

    console.log(
        `Better Auth identity verified: ${users} Users have credential accounts and Organization membership; ${organizations} Organizations have ${ownerMembers} Owners.`
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
