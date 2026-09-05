import prisma, { Prisma } from '@inventory-system/database';
import type { UpdateProductRequest } from '@inventory-system/contracts';
import { buildSearchText } from '../domain/product-search-text';

/** Errors carry the HTTP status the controller should report, without importing Express here. */
const failure = (message: string, statusCode: number, code: string) =>
    Object.assign(new Error(message), { statusCode, code });

export const productInclude = {
    images: { orderBy: { sortOrder: 'asc' as const } },
    category: true,
    versions: {
        where: { deletedAt: null },
        orderBy: { versionNumber: 'asc' as const },
        include: { images: { orderBy: { sortOrder: 'asc' as const } } },
    },
    _count: { select: { versions: { where: { deletedAt: null } } } },
};

/**
 * A product and its primary version must agree on identity, so both rows change together inside
 * one serializable transaction. The row is locked first: without it two concurrent updates can
 * each read the pre-update state and write a mismatched pair.
 */
export const updateProduct = (
    vendorProfileId: string,
    id: string,
    body: UpdateProductRequest
) => {
    const { categoryId, sku, baseName, barcode, characteristics, status } = body;

    return prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
            const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
                SELECT id
                FROM products
                WHERE id = ${id}
                  AND vendor_profile_id = ${vendorProfileId}
                  AND deleted_at IS NULL
                FOR UPDATE
            `;
            if (lockedRows.length === 0) {
                throw failure('Product not found', 404, 'PRODUCT_NOT_FOUND');
            }

            const product = await tx.product.findFirst({
                where: { id, vendorProfileId, deletedAt: null },
                include: {
                    category: { select: { name: true } },
                    versions: {
                        where: { isPrimary: true, deletedAt: null },
                        take: 1,
                        select: {
                            id: true,
                            label: true,
                            sku: true,
                            barcode: true,
                            characteristics: true,
                        },
                    },
                },
            });
            if (!product) {
                throw failure('Product not found', 404, 'PRODUCT_NOT_FOUND');
            }

            let categoryName = product.category.name;
            if (categoryId !== undefined) {
                const category = await tx.category.findFirst({
                    where: {
                        id: categoryId,
                        OR: [{ vendorProfileId: null }, { vendorProfileId }],
                    },
                    select: { id: true, name: true },
                });
                if (!category) {
                    throw failure('Category is not available', 400, 'CATEGORY_NOT_AVAILABLE');
                }
                categoryName = category.name;
            }

            const nextName = baseName ?? product.baseName;
            const nextSku = sku ?? product.sku;
            const nextBarcode = barcode === undefined ? product.barcode : barcode;
            const nextCharacteristics = (characteristics ??
                product.characteristics) as Prisma.InputJsonValue;

            await tx.product.update({
                where: { id },
                data: {
                    ...(categoryId !== undefined && { categoryId }),
                    ...(sku !== undefined && { sku }),
                    ...(baseName !== undefined && { baseName }),
                    ...(barcode !== undefined && { barcode }),
                    ...(characteristics !== undefined && {
                        characteristics: nextCharacteristics,
                    }),
                    ...(status !== undefined && { status }),
                    searchText: buildSearchText(nextName, nextSku, nextBarcode, categoryName),
                },
            });

            const primaryVersion = product.versions[0];
            if (!primaryVersion) {
                throw failure('Product has no primary version', 409, 'PRIMARY_VERSION_REQUIRED');
            }
            if (
                baseName !== undefined ||
                categoryId !== undefined ||
                sku !== undefined ||
                barcode !== undefined ||
                characteristics !== undefined
            ) {
                await tx.productVersion.update({
                    where: { id: primaryVersion.id },
                    data: {
                        ...(sku !== undefined && { sku }),
                        ...(barcode !== undefined && { barcode }),
                        ...(characteristics !== undefined && {
                            characteristics: nextCharacteristics,
                        }),
                        searchText: buildSearchText(
                            nextName,
                            primaryVersion.label,
                            nextSku,
                            nextBarcode,
                            categoryName
                        ),
                    },
                });
            }

            /**
             * Every version's search text embeds the product name and category, so renaming
             * or recategorizing the product leaves secondary versions unfindable until they
             * are rebuilt too.
             */
            if (baseName !== undefined || categoryId !== undefined) {
                const secondaryVersions = await tx.productVersion.findMany({
                    where: { productId: id, deletedAt: null, id: { not: primaryVersion.id } },
                    select: { id: true, label: true, sku: true, barcode: true },
                });
                await Promise.all(
                    secondaryVersions.map((version) =>
                        tx.productVersion.update({
                            where: { id: version.id },
                            data: {
                                searchText: buildSearchText(
                                    nextName,
                                    version.label,
                                    version.sku,
                                    version.barcode,
                                    categoryName
                                ),
                            },
                        })
                    )
                );
            }

            return tx.product.findUnique({ where: { id }, include: productInclude });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
};
