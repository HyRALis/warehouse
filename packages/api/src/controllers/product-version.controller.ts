import { NextFunction, Response } from 'express';
import prisma, { Prisma, ProductStatus } from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { QRCodeService } from '../services/qrcode.service';
import { StorageService } from '../services/storage.service';

const versionInclude = {
    images: { orderBy: { sortOrder: 'asc' as const } },
    product: { select: { id: true, baseName: true, status: true, deletedAt: true } },
};

const effectiveStatus = (
    productStatus: ProductStatus,
    versionStatus: ProductStatus
): ProductStatus => {
    if (
        productStatus === ProductStatus.DISCONTINUED ||
        versionStatus === ProductStatus.DISCONTINUED
    ) {
        return ProductStatus.DISCONTINUED;
    }
    if (productStatus === ProductStatus.ACTIVE && versionStatus === ProductStatus.ACTIVE) {
        return ProductStatus.ACTIVE;
    }
    return ProductStatus.DRAFT;
};

const serializeVersion = <
    T extends { isPrimary: boolean; status: ProductStatus; product: { status: ProductStatus } },
>(version: T) => ({
    ...version,
    effectiveStatus: effectiveStatus(version.product.status, version.status),
    canDelete: !version.isPrimary,
});

const buildSearchText = (...values: Array<string | null | undefined>) =>
    values.filter(Boolean).join(' ').trim().toLowerCase();

const generateVersionSku = async (
    tx: Prisma.TransactionClient,
    vendorId: string,
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
            tx.product.findFirst({ where: { vendorId, sku: candidate }, select: { id: true } }),
            tx.productVersion.findFirst({
                where: { vendorId, sku: candidate },
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

const respondToVersionConflict = (error: unknown, res: Response): boolean => {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
        res.status(409).json({
            success: false,
            code: 'IDENTIFIER_CONFLICT',
            message: 'That SKU or barcode is already used by one of your versions.',
        });
        return true;
    }
    if (code === 'P2034') {
        res.status(409).json({
            success: false,
            code: 'VERSION_CONFLICT',
            message: 'The product changed at the same time. Please retry.',
        });
        return true;
    }
    return false;
};

export class ProductVersionController {
    static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await prisma.product.findFirst({
                where: { id: req.params.productId, vendorId: req.vendorId, deletedAt: null },
                select: { id: true, status: true },
            });
            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            const versions = await prisma.productVersion.findMany({
                where: { productId: product.id, vendorId: req.vendorId, deletedAt: null },
                include: versionInclude,
                orderBy: { versionNumber: 'asc' },
            });
            res.status(200).json({ success: true, data: versions.map(serializeVersion) });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const version = await prisma.productVersion.findFirst({
                where: {
                    id: req.params.versionId,
                    productId: req.params.productId,
                    vendorId: req.vendorId,
                    deletedAt: null,
                    product: { deletedAt: null },
                },
                include: versionInclude,
            });
            if (!version) {
                res.status(404).json({ success: false, message: 'Product version not found' });
                return;
            }
            res.status(200).json({ success: true, data: serializeVersion(version) });
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId!;
            const productId = req.params.productId;
            const {
                label,
                mode,
                sourceVersionId,
                sku,
                barcode,
                status = ProductStatus.DRAFT,
                characteristics,
                designNotes,
                generateQrCode = true,
                copyImages = true,
                setAsPrimary = false,
            } = req.body;

            const product = await prisma.product.findFirst({
                where: { id: productId, vendorId, deletedAt: null },
                select: { id: true, baseName: true, status: true },
            });
            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            const created = await prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} AND vendor_id = ${vendorId} AND deleted_at IS NULL FOR UPDATE`;

                    const source =
                        mode === 'COPY'
                            ? await tx.productVersion.findFirst({
                                  where: {
                                      id: sourceVersionId,
                                      productId,
                                      vendorId,
                                      deletedAt: null,
                                  },
                                  include: { images: { orderBy: { sortOrder: 'asc' } } },
                              })
                            : null;
                    if (mode === 'COPY' && !source) {
                        throw Object.assign(new Error('Source version not found'), {
                            statusCode: 404,
                            code: 'SOURCE_VERSION_NOT_FOUND',
                        });
                    }

                    const latest = await tx.productVersion.findFirst({
                        where: { productId },
                        orderBy: { versionNumber: 'desc' },
                        select: { versionNumber: true },
                    });
                    const resolvedSku =
                        sku?.trim() ||
                        (await generateVersionSku(tx, vendorId, product.baseName, label));
                    const resolvedCharacteristics = (characteristics ??
                        source?.characteristics ??
                        []) as Prisma.InputJsonValue;
                    const resolvedDesignNotes =
                        designNotes !== undefined
                            ? designNotes.trim() || null
                            : source?.designNotes || null;
                    const searchText = buildSearchText(
                        product.baseName,
                        label,
                        resolvedSku,
                        barcode
                    );

                    const version = await tx.productVersion.create({
                        data: {
                            productId,
                            vendorId,
                            versionNumber: (latest?.versionNumber || 0) + 1,
                            label,
                            sku: resolvedSku,
                            barcode: barcode || null,
                            status,
                            characteristics: resolvedCharacteristics,
                            designNotes: resolvedDesignNotes,
                            isPrimary: false,
                            searchText,
                        },
                    });

                    if (source && copyImages && source.images.length > 0) {
                        await tx.productImage.createMany({
                            data: source.images.map((image) => ({
                                productId,
                                productVersionId: version.id,
                                imageUrl: image.imageUrl,
                                sortOrder: image.sortOrder,
                            })),
                        });
                    }

                    if (setAsPrimary) {
                        await tx.productVersion.updateMany({
                            where: { productId, deletedAt: null },
                            data: { isPrimary: false },
                        });
                        await tx.productVersion.update({
                            where: { id: version.id },
                            data: { isPrimary: true },
                        });
                        await tx.product.update({
                            where: { id: productId },
                            data: {
                                sku: version.sku,
                                barcode: version.barcode,
                                characteristics: version.characteristics as Prisma.InputJsonValue,
                            },
                        });
                    }

                    return { id: version.id, isPrimary: setAsPrimary };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );

            if (generateQrCode) {
                try {
                    const qrCodeUrl = await QRCodeService.generateQRCode(created.id);
                    await prisma.productVersion.update({
                        where: { id: created.id },
                        data: { qrCodeUrl },
                    });
                    if (created.isPrimary) {
                        await prisma.product.update({
                            where: { id: productId },
                            data: { qrCodeUrl },
                        });
                    }
                } catch (error) {
                    console.error('Failed to generate optional version QR code', error);
                }
            }

            const version = await prisma.productVersion.findUnique({
                where: { id: created.id },
                include: versionInclude,
            });
            res.status(201).json({
                success: true,
                data: version && serializeVersion(version),
            });
        } catch (error) {
            if (respondToVersionConflict(error, res)) return;
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId!;
            const { productId, versionId } = req.params;
            const { label, sku, barcode, status, characteristics, designNotes, generateQrCode } =
                req.body;

            const updated = await prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} AND vendor_id = ${vendorId} AND deleted_at IS NULL FOR UPDATE`;
                    const existing = await tx.productVersion.findFirst({
                        where: {
                            id: versionId,
                            productId,
                            vendorId,
                            deletedAt: null,
                            product: { deletedAt: null },
                        },
                        include: { product: { select: { baseName: true } } },
                    });
                    if (!existing) {
                        throw Object.assign(new Error('Product version not found'), {
                            statusCode: 404,
                            code: 'VERSION_NOT_FOUND',
                        });
                    }

                    const version = await tx.productVersion.update({
                        where: { id: versionId },
                        data: {
                            ...(label !== undefined && { label }),
                            ...(sku !== undefined && { sku }),
                            ...(barcode !== undefined && { barcode }),
                            ...(status !== undefined && { status }),
                            ...(characteristics !== undefined && {
                                characteristics: characteristics as Prisma.InputJsonValue,
                            }),
                            ...(designNotes !== undefined && { designNotes }),
                            searchText: buildSearchText(
                                existing.product.baseName,
                                label ?? existing.label,
                                sku ?? existing.sku,
                                barcode === undefined ? existing.barcode : barcode
                            ),
                        },
                    });

                    if (existing.isPrimary) {
                        await tx.product.update({
                            where: { id: productId },
                            data: {
                                sku: version.sku,
                                barcode: version.barcode,
                                qrCodeUrl: version.qrCodeUrl,
                                characteristics: version.characteristics as Prisma.InputJsonValue,
                                searchText: buildSearchText(
                                    existing.product.baseName,
                                    version.sku,
                                    version.barcode
                                ),
                            },
                        });
                    }
                    return { id: version.id, isPrimary: existing.isPrimary };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );

            if (generateQrCode) {
                try {
                    const qrCodeUrl = await QRCodeService.generateQRCode(updated.id);
                    await prisma.productVersion.update({
                        where: { id: updated.id },
                        data: { qrCodeUrl },
                    });
                    if (updated.isPrimary) {
                        await prisma.product.update({
                            where: { id: productId },
                            data: { qrCodeUrl },
                        });
                    }
                } catch (error) {
                    console.error('Failed to generate optional version QR code', error);
                }
            }

            const version = await prisma.productVersion.findUnique({
                where: { id: updated.id },
                include: versionInclude,
            });
            res.status(200).json({ success: true, data: version && serializeVersion(version) });
        } catch (error) {
            if (respondToVersionConflict(error, res)) return;
            next(error);
        }
    }

    static async setPrimary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId!;
            const { productId, versionId } = req.params;
            await prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} AND vendor_id = ${vendorId} AND deleted_at IS NULL FOR UPDATE`;
                    const version = await tx.productVersion.findFirst({
                        where: {
                            id: versionId,
                            productId,
                            vendorId,
                            deletedAt: null,
                            product: { deletedAt: null },
                        },
                        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
                    });
                    if (!version) {
                        throw Object.assign(new Error('Product version not found'), {
                            statusCode: 404,
                            code: 'VERSION_NOT_FOUND',
                        });
                    }

                    await tx.productVersion.updateMany({
                        where: { productId, deletedAt: null },
                        data: { isPrimary: false },
                    });
                    await tx.productVersion.update({
                        where: { id: versionId },
                        data: { isPrimary: true },
                    });
                    await tx.product.update({
                        where: { id: productId },
                        data: {
                            sku: version.sku,
                            barcode: version.barcode,
                            qrCodeUrl: version.qrCodeUrl,
                            imageUrl: version.images[0]?.imageUrl || null,
                            characteristics: version.characteristics as Prisma.InputJsonValue,
                        },
                    });
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );

            const version = await prisma.productVersion.findUnique({
                where: { id: versionId },
                include: versionInclude,
            });
            res.status(200).json({ success: true, data: version && serializeVersion(version) });
        } catch (error) {
            if (respondToVersionConflict(error, res)) return;
            next(error);
        }
    }

    static async softDelete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { productId, versionId } = req.params;
            const version = await prisma.productVersion.findFirst({
                where: {
                    id: versionId,
                    productId,
                    vendorId: req.vendorId,
                    deletedAt: null,
                    product: { deletedAt: null },
                },
                select: { id: true, isPrimary: true },
            });
            if (!version) {
                res.status(404).json({ success: false, message: 'Product version not found' });
                return;
            }
            if (version.isPrimary) {
                res.status(409).json({
                    success: false,
                    code: 'PRIMARY_VERSION_REQUIRED',
                    message: 'Set another primary version before deleting this one.',
                });
                return;
            }

            const versionCount = await prisma.productVersion.count({
                where: { productId, vendorId: req.vendorId, deletedAt: null },
            });
            if (versionCount <= 1) {
                res.status(409).json({
                    success: false,
                    code: 'LAST_VERSION_REQUIRED',
                    message: 'A product must keep at least one version.',
                });
                return;
            }

            await prisma.productVersion.update({
                where: { id: versionId },
                data: { deletedAt: new Date(), status: ProductStatus.DISCONTINUED },
            });
            res.status(200).json({ success: true, message: 'Product version deleted' });
        } catch (error) {
            next(error);
        }
    }

    static async compare(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const productId = req.params.productId;
            const leftId = req.query.leftId as string;
            const rightId = req.query.rightId as string;
            const versions = await prisma.productVersion.findMany({
                where: {
                    id: { in: [leftId, rightId] },
                    productId,
                    vendorId: req.vendorId,
                    deletedAt: null,
                    product: { deletedAt: null },
                },
                include: versionInclude,
            });
            const left = versions.find((version) => version.id === leftId);
            const right = versions.find((version) => version.id === rightId);
            if (!left || !right) {
                res.status(404).json({ success: false, message: 'Product version not found' });
                return;
            }

            const fields = [
                'label',
                'sku',
                'barcode',
                'status',
                'designNotes',
                'characteristics',
            ] as const;
            const differences = fields
                .filter((field) => JSON.stringify(left[field]) !== JSON.stringify(right[field]))
                .map((field) => ({ field, left: left[field], right: right[field] }));

            res.status(200).json({
                success: true,
                data: {
                    left: serializeVersion(left),
                    right: serializeVersion(right),
                    differences,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    static async uploadImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { productId, versionId } = req.params;
            const version = await prisma.productVersion.findFirst({
                where: {
                    id: versionId,
                    productId,
                    vendorId: req.vendorId,
                    deletedAt: null,
                    product: { deletedAt: null },
                },
                include: { images: true },
            });
            if (!version) {
                res.status(404).json({ success: false, message: 'Product version not found' });
                return;
            }
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file provided' });
                return;
            }
            if (version.images.length >= 4) {
                res.status(400).json({ success: false, message: 'Maximum of 4 images per version' });
                return;
            }

            const imageUrl = await StorageService.uploadFile(req.file);
            const image = await prisma.productImage.create({
                data: {
                    productId,
                    productVersionId: versionId,
                    imageUrl,
                    sortOrder: version.images.length,
                },
            });
            if (version.isPrimary && version.images.length === 0) {
                await prisma.product.update({ where: { id: productId }, data: { imageUrl } });
            }
            res.status(201).json({ success: true, data: image });
        } catch (error) {
            next(error);
        }
    }
}
