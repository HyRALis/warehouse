import type { ProductStatus } from '@inventory-system/contracts';

const DISCONTINUED: ProductStatus = 'DISCONTINUED';
const ACTIVE: ProductStatus = 'ACTIVE';
const DRAFT: ProductStatus = 'DRAFT';

/** A version is only as available as its product: the stricter of the two statuses wins. */
export const effectiveStatus = (
    productStatus: ProductStatus,
    versionStatus: ProductStatus
): ProductStatus => {
    if (productStatus === DISCONTINUED || versionStatus === DISCONTINUED) return DISCONTINUED;
    if (productStatus === ACTIVE && versionStatus === ACTIVE) return ACTIVE;
    return DRAFT;
};

export const serializeVersion = <
    T extends { isPrimary: boolean; status: ProductStatus; product: { status: ProductStatus } },
>(
    version: T
) => ({
    ...version,
    effectiveStatus: effectiveStatus(version.product.status, version.status),
    canDelete: !version.isPrimary,
});

export const buildSearchText = (...values: Array<string | null | undefined>) =>
    values.filter(Boolean).join(' ').trim().toLowerCase();
