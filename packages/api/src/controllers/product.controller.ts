import { Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import prisma, { Prisma, ProductStatus } from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage.service';
import { QRCodeService } from '../services/qrcode.service';

const productInclude = {
    images: { orderBy: { sortOrder: 'asc' as const } },
    category: true,
    versions: {
        where: { deletedAt: null },
        orderBy: { versionNumber: 'asc' as const },
        include: { images: { orderBy: { sortOrder: 'asc' as const } } },
    },
    _count: { select: { versions: { where: { deletedAt: null } } } },
};

const serializeProduct = <T extends { versions?: Array<{ isPrimary: boolean }>; _count?: { versions: number } }>(
    product: T
) => {
    const versions = product.versions || [];
    return {
        ...product,
        versionCount: product._count?.versions ?? versions.length,
        primaryVersion: versions.find((version) => version.isPrimary) || versions[0] || null,
    };
};

const buildSearchText = (...values: Array<string | null | undefined>) =>
    values.filter(Boolean).join(' ').trim().toLowerCase();

const generateSku = async (vendorId: string, baseName: string): Promise<string> => {
    const prefix =
        baseName
            .normalize('NFKD')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 12)
            .toUpperCase() || 'PRODUCT';

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
        const candidate = `${prefix}-${suffix}`;
        const [product, version] = await Promise.all([
            prisma.product.findFirst({ where: { vendorId, sku: candidate }, select: { id: true } }),
            prisma.productVersion.findFirst({
                where: { vendorId, sku: candidate },
                select: { id: true },
            }),
        ]);
        if (!product && !version) return candidate;
    }

    throw Object.assign(new Error('Could not generate a unique SKU. Please enter one manually.'), {
        statusCode: 409,
        code: 'SKU_GENERATION_FAILED',
    });
};

export class ProductController {
    /**
     * List products with pagination and filtering
     */
    static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const search = req.query.search as string | undefined;
            const status = req.query.status as ProductStatus | undefined;
            const categoryId = req.query.categoryId as string | undefined;

            if (status && !Object.values(ProductStatus).includes(status)) {
                res.status(400).json({ success: false, message: 'Invalid product status' });
                return;
            }

            const where: Prisma.ProductWhereInput = {
                vendorId: req.vendorId,
                deletedAt: null,
            };

            if (status) {
                where.status = status;
            }

            if (categoryId) {
                where.categoryId = categoryId;
            }

            if (search) {
                where.OR = [
                    { baseName: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                ];
            }

            const total = await prisma.product.count({ where });
            const totalPages = Math.ceil(total / limit);
            const skip = (page - 1) * limit;

            const products = await prisma.product.findMany({
                where,
                skip,
                take: limit,
                include: productInclude,
                orderBy: { createdAt: 'desc' },
            });

            res.status(200).json({
                success: true,
                data: products.map(serializeProduct),
                meta: { total, page, limit, totalPages },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get product by ID
     */
    static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const product = await prisma.product.findFirst({
                where: { id, vendorId: req.vendorId, deletedAt: null },
                include: productInclude,
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            res.status(200).json({ success: true, data: serializeProduct(product) });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new product
     */
    static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                categoryId,
                sku,
                baseName,
                barcode,
                characteristics = [],
                designNotes,
                generateQrCode = true,
                productStatus,
                versionStatus,
                status,
            } = req.body;
            const vendorId = req.vendorId!;

            const category = await prisma.category.findFirst({
                where: {
                    id: categoryId,
                    OR: [{ vendorId: null }, { vendorId }],
                },
                select: { id: true, name: true },
            });

            if (!category) {
                res.status(400).json({ success: false, message: 'Category is not available' });
                return;
            }

            const parsedCharacteristics: Prisma.InputJsonValue =
                typeof characteristics === 'string' ? JSON.parse(characteristics) : characteristics;
            const resolvedSku = sku?.trim() || (await generateSku(vendorId, baseName));
            const resolvedProductStatus: ProductStatus = productStatus || status || ProductStatus.DRAFT;
            const resolvedVersionStatus: ProductStatus = versionStatus || ProductStatus.DRAFT;
            const searchText = buildSearchText(baseName, resolvedSku, barcode, category.name);

            const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const newProduct = await tx.product.create({
                    data: {
                        categoryId,
                        sku: resolvedSku,
                        baseName,
                        barcode,
                        characteristics: parsedCharacteristics,
                        status: resolvedProductStatus,
                        searchText,
                        vendorId,
                    },
                });

                const initialVersion = await tx.productVersion.create({
                    data: {
                        productId: newProduct.id,
                        vendorId,
                        versionNumber: 1,
                        label: 'Original',
                        sku: resolvedSku,
                        barcode,
                        characteristics: parsedCharacteristics,
                        designNotes: designNotes?.trim() || null,
                        status: resolvedVersionStatus,
                        isPrimary: true,
                        searchText,
                    },
                });

                return { productId: newProduct.id, versionId: initialVersion.id };
            });

            if (generateQrCode) {
                try {
                    const qrCodeUrl = await QRCodeService.generateQRCode(created.versionId);
                    await Promise.all([
                        prisma.product.update({
                            where: { id: created.productId },
                            data: { qrCodeUrl },
                        }),
                        prisma.productVersion.update({
                            where: { id: created.versionId },
                            data: { qrCodeUrl },
                        }),
                    ]);
                } catch (error) {
                    console.error('Failed to generate optional QR code', error);
                }
            }

            const product = await prisma.product.findUnique({
                where: { id: created.productId },
                include: productInclude,
            });

            res.status(201).json({ success: true, data: product && serializeProduct(product) });
        } catch (error) {
            if ((error as { code?: string }).code === 'P2002') {
                res.status(409).json({
                    success: false,
                    code: 'IDENTIFIER_CONFLICT',
                    message: 'That SKU or barcode is already used by one of your products.',
                });
                return;
            }
            next(error);
        }
    }

    /**
     * Update an existing product
     */
    static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { categoryId, sku, baseName, barcode, characteristics, status } = req.body;
            const vendorId = req.vendorId!;

            const product = await prisma.product.findFirst({
                where: { id, vendorId, deletedAt: null },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            if (categoryId !== undefined) {
                const category = await prisma.category.findFirst({
                    where: {
                        id: categoryId,
                        OR: [{ vendorId: null }, { vendorId }],
                    },
                    select: { id: true },
                });

                if (!category) {
                    res.status(400).json({ success: false, message: 'Category is not available' });
                    return;
                }
            }

            let parsedCharacteristics = characteristics;
            if (characteristics && typeof characteristics === 'string') {
                parsedCharacteristics = JSON.parse(characteristics);
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    ...(categoryId !== undefined && { categoryId }),
                    ...(sku !== undefined && { sku }),
                    ...(baseName !== undefined && { baseName }),
                    ...(barcode !== undefined && { barcode }),
                    ...(parsedCharacteristics !== undefined && {
                        characteristics: parsedCharacteristics,
                    }),
                    ...(status !== undefined && { status }),
                },
                include: { images: true, category: true },
            });

            res.status(200).json({ success: true, data: updatedProduct });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Soft delete a product
     */
    static async softDelete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const product = await prisma.product.findFirst({
                where: { id, vendorId: req.vendorId, deletedAt: null },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            await prisma.product.update({
                where: { id },
                data: { deletedAt: new Date() },
            });

            res.status(200).json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload an image for a product
     */
    static async uploadImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const product = await prisma.product.findFirst({
                where: { id, vendorId: req.vendorId, deletedAt: null },
                include: {
                    images: true,
                    versions: {
                        where: { isPrimary: true, deletedAt: null },
                        take: 1,
                        select: { id: true },
                    },
                },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            if (product.images.length >= 4) {
                res.status(400).json({
                    success: false,
                    message: 'Maximum of 4 product images allowed',
                });
                return;
            }

            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file provided' });
                return;
            }

            const imageUrl = await StorageService.uploadFile(req.file);

            const productImage = await prisma.productImage.create({
                data: {
                    productId: id,
                    productVersionId: product.versions[0]?.id,
                    imageUrl,
                    sortOrder: product.images.length,
                },
            });

            res.status(201).json({ success: true, data: productImage });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a product image
     */
    static async deleteImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, imageId } = req.params;

            const product = await prisma.product.findFirst({
                where: { id, vendorId: req.vendorId, deletedAt: null },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            const productImage = await prisma.productImage.findFirst({
                where: { id: imageId, productId: id },
            });

            if (!productImage) {
                res.status(404).json({ success: false, message: 'Image not found' });
                return;
            }

            await StorageService.deleteFile(productImage.imageUrl);

            await prisma.productImage.delete({ where: { id: imageId } });

            res.status(200).json({ success: true, message: 'Image deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Import products from CSV
     */
    static async importCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No CSV file provided' });
                return;
            }

            const records = parse(req.file.buffer.toString('utf-8'), {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            }) as Record<string, string>[];

            if (records.length > 1000) {
                res.status(400).json({
                    success: false,
                    message: 'A CSV import is limited to 1,000 products',
                });
                return;
            }

            let imported = 0;
            const errors: string[] = [];

            for (let i = 0; i < records.length; i++) {
                const row = records[i];
                try {
                    if (!row.sku || !row.baseName || !row.categoryId) {
                        errors.push(`Row ${i + 2}: sku, baseName, and categoryId are required`);
                        continue;
                    }

                    const category = await prisma.category.findFirst({
                        where: {
                            id: row.categoryId,
                            OR: [{ vendorId: null }, { vendorId: req.vendorId }],
                        },
                        select: { id: true },
                    });
                    if (!category) {
                        errors.push(`Row ${i + 2}: Category is not available`);
                        continue;
                    }

                    const status = (row.status || ProductStatus.DRAFT) as ProductStatus;
                    if (!Object.values(ProductStatus).includes(status)) {
                        errors.push(`Row ${i + 2}: Invalid product status`);
                        continue;
                    }

                    let characteristics: Prisma.InputJsonValue = [];
                    try {
                        if (row.characteristics) characteristics = JSON.parse(row.characteristics);
                    } catch {
                        errors.push(`Row ${i + 2}: Invalid JSON in characteristics`);
                        continue;
                    }

                    const product = await prisma.product.create({
                        data: {
                            sku: row.sku,
                            baseName: row.baseName,
                            categoryId: row.categoryId,
                            barcode: row.barcode || null,
                            status,
                            characteristics,
                            vendorId: req.vendorId!,
                        },
                    });

                    try {
                        const qrCodeUrl = await QRCodeService.generateQRCode(product.id);
                        await prisma.product.update({
                            where: { id: product.id },
                            data: { qrCodeUrl },
                        });
                    } catch {
                        // The product remains usable if optional QR rendering fails.
                    }
                    imported++;
                } catch (error) {
                    const message =
                        (error as { code?: string }).code === 'P2002'
                            ? 'A product with this SKU already exists'
                            : 'Could not import this row';
                    errors.push(`Row ${i + 2}: ${message}`);
                }
            }

            res.status(200).json({
                success: true,
                data: { imported, errors },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Export products to CSV
     */
    static async exportCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const products = await prisma.product.findMany({
                where: { vendorId: req.vendorId, deletedAt: null },
                include: { category: true },
            });

            const csvData = products.map((product) => ({
                id: product.id,
                sku: product.sku,
                baseName: product.baseName,
                categoryId: product.categoryId,
                categoryName: product.category?.name || '',
                barcode: product.barcode,
                status: product.status,
                characteristics: JSON.stringify(product.characteristics),
                createdAt: product.createdAt.toISOString(),
            }));

            const csvString = stringify(csvData, { header: true });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
            res.status(200).send(csvString);
        } catch (error) {
            next(error);
        }
    }
}
