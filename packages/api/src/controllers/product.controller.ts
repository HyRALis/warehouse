import { Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import prisma, { Prisma, ProductStatus } from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage.service';
import { QRCodeService } from '../services/qrcode.service';

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
                include: { images: true, category: true },
                orderBy: { createdAt: 'desc' },
            });

            res.status(200).json({
                success: true,
                data: products,
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
                include: { images: true, category: true },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            res.status(200).json({ success: true, data: product });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new product
     */
    static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { categoryId, sku, baseName, barcode, characteristics, status } = req.body;
            const vendorId = req.vendorId!;

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

            let parsedCharacteristics: Prisma.InputJsonValue = [];
            if (characteristics) {
                parsedCharacteristics =
                    typeof characteristics === 'string'
                        ? JSON.parse(characteristics)
                        : characteristics;
            }

            const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const newProduct = await tx.product.create({
                    data: {
                        categoryId,
                        sku,
                        baseName,
                        barcode,
                        characteristics: parsedCharacteristics,
                        status: status || 'DRAFT',
                        vendorId,
                    },
                });

                let qrCodeUrl = null;
                try {
                    qrCodeUrl = await QRCodeService.generateQRCode(newProduct.id);
                } catch (e) {
                    console.error('Failed to generate QR code', e);
                }

                if (qrCodeUrl) {
                    await tx.product.update({
                        where: { id: newProduct.id },
                        data: { qrCodeUrl },
                    });
                }

                return tx.product.findUnique({
                    where: { id: newProduct.id },
                    include: { images: true, category: true },
                });
            });

            res.status(201).json({ success: true, data: product });
        } catch (error) {
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
                include: { images: true },
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
