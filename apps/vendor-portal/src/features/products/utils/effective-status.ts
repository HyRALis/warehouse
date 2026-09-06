import type { ProductStatus } from '@inventory-system/contracts';

export const calculateEffectiveStatus = (
    productStatus: ProductStatus,
    versionStatus: ProductStatus
): ProductStatus => {
    if (productStatus === 'DISCONTINUED' || versionStatus === 'DISCONTINUED') return 'DISCONTINUED';
    return productStatus === 'ACTIVE' && versionStatus === 'ACTIVE' ? 'ACTIVE' : 'DRAFT';
};
