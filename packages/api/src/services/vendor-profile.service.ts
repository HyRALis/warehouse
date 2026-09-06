import { Prisma } from '@inventory-system/database';

export const VENDOR_PORTAL_KEY = 'vendor';
export const PRIMARY_VENDOR_PROFILE_KEY = 'primary';

export class VendorProfileCreationError extends Error {
    constructor(
        public readonly code: 'PRIMARY_PROFILE_ONLY' | 'PRIMARY_PROFILE_EXISTS',
        message: string
    ) {
        super(message);
        this.name = 'VendorProfileCreationError';
    }
}

interface CreateVendorProfileInput {
    organizationId: string;
    profileKey?: string;
    displayName: string;
    profileId?: string;
}

/**
 * The data model supports additional profile keys later, but this release deliberately permits
 * exactly one `primary` profile per Organization. The unique constraint is the concurrency guard;
 * the explicit check provides a stable service error for ordinary duplicate requests.
 */
export const createVendorProfile = async (
    transaction: Prisma.TransactionClient,
    input: CreateVendorProfileInput
) => {
    const profileKey = input.profileKey ?? PRIMARY_VENDOR_PROFILE_KEY;
    if (profileKey !== PRIMARY_VENDOR_PROFILE_KEY) {
        throw new VendorProfileCreationError(
            'PRIMARY_PROFILE_ONLY',
            'Only the primary Vendor Profile can be created in this release'
        );
    }

    const existing = await transaction.vendorProfile.findUnique({
        where: {
            organizationId_profileKey: {
                organizationId: input.organizationId,
                profileKey,
            },
        },
        select: { id: true },
    });
    if (existing) {
        throw new VendorProfileCreationError(
            'PRIMARY_PROFILE_EXISTS',
            'The Organization already has a primary Vendor Profile'
        );
    }

    try {
        return await transaction.vendorProfile.create({
            data: {
                ...(input.profileId ? { id: input.profileId } : {}),
                organizationId: input.organizationId,
                profileKey,
                displayName: input.displayName,
            },
        });
    } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
            throw new VendorProfileCreationError(
                'PRIMARY_PROFILE_EXISTS',
                'The Organization already has a primary Vendor Profile'
            );
        }
        throw error;
    }
};
