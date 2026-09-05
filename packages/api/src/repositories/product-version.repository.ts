import prisma, { Prisma } from '@inventory-system/database';

export const versionInclude = {
    images: { orderBy: { sortOrder: 'asc' as const } },
    product: { select: { id: true, baseName: true, status: true, deletedAt: true } },
};

/**
 * Version writes read the product first, so the product row is locked for the whole transaction.
 * The lock predicate is also the tenancy check: another vendor's product simply does not match.
 */
export const lockOwnedProduct = async (
    tx: Prisma.TransactionClient,
    productId: string,
    vendorProfileId: string
): Promise<void> => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM products
        WHERE id = ${productId}
          AND vendor_profile_id = ${vendorProfileId}
          AND deleted_at IS NULL
        FOR UPDATE
    `;
    if (rows.length === 0) {
        throw Object.assign(new Error('Product not found'), {
            statusCode: 404,
            code: 'PRODUCT_NOT_FOUND',
        });
    }
};

/** SKUs are unique per vendor across both products and versions, so both are checked. */
/**
 * The image row and the product's cover image must both land or neither: a committed row whose
 * file was never stored renders a broken image the vendor cannot clear.
 */
export const createVersionImage = (
    vendorProfileId: string,
    productId: string,
    versionId: string,
    imageUrl: string
) =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await lockOwnedProduct(tx, productId, vendorProfileId);
        // Recheck after the upload: another request may have filled the last slot,
        // deleted the version, or selected a different primary in the meantime.
        const version = await tx.productVersion.findFirst({
            where: { id: versionId, productId, vendorProfileId, deletedAt: null },
            include: { images: { orderBy: { sortOrder: 'desc' } } },
        });
        if (!version) {
            throw Object.assign(new Error('Product version not found'), {
                statusCode: 404, code: 'VERSION_NOT_FOUND',
            });
        }
        if (version.images.length >= 4) {
            throw Object.assign(new Error('Maximum of 4 images per version'), {
                statusCode: 409, code: 'IMAGE_LIMIT_EXCEEDED',
            });
        }
        const sortOrder = (version.images[0]?.sortOrder ?? -1) + 1;
        const createdImage = await tx.productImage.create({
            data: { productId, productVersionId: versionId, imageUrl, sortOrder },
        });
        if (version.isPrimary && version.images.length === 0) {
            await tx.product.update({ where: { id: productId }, data: { imageUrl } });
        }
        return createdImage;
    });

export const generateVersionSku = async (
    tx: Prisma.TransactionClient,
    vendorProfileId: string,
    baseName: string,
    label: string
): Promise<string> => {
    const prefix =
        `${baseName}-${label}`
            .normalize('NFKD')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 16)
            .toUpperCase() || 'VERSION';

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
        const candidate = `${prefix}-${suffix}`;
        const [product, version] = await Promise.all([
            tx.product.findFirst({
                where: { vendorProfileId, sku: candidate },
                select: { id: true },
            }),
            tx.productVersion.findFirst({
                where: { vendorProfileId, sku: candidate },
                select: { id: true },
            }),
        ]);
        if (!product && !version) return candidate;
    }

    throw Object.assign(new Error('Could not generate a unique version SKU.'), {
        statusCode: 409,
        code: 'SKU_GENERATION_FAILED',
    });
};


