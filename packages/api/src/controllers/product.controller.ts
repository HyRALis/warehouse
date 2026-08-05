import { Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import prisma from '@inventory-system/database';
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
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const search = req.query.search as string | undefined;
            const status = req.query.status as any | undefined;
            const categoryId = req.query.categoryId as string | undefined;

            const where: any = {
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

            let parsedCharacteristics = {};
            if (characteristics) {
                parsedCharacteristics =
                    typeof characteristics === 'string'
                        ? JSON.parse(characteristics)
                        : characteristics;
            }

            const product = await prisma.$transaction(async (tx) => {
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

                if (req.file) {
                    const imageUrl = await StorageService.uploadFile(req.file);
                    await tx.productImage.create({
                        data: {
                            productId: newProduct.id,
                            url: imageUrl,
                            sortOrder: 0,
                        },
                    });
                }

                return tx.product.findUnique({
                    where: { id: newProduct.id },
                    include: { images: true },
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

            const product = await prisma.product.findFirst({
                where: { id, vendorId: req.vendorId, deletedAt: null },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
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
                include: { images: true },
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
                    message: 'Maximum of 4 additional images allowed',
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
                    url: imageUrl,
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

            const filename = productImage.url.split('/').pop() as string;
            await StorageService.deleteFile(filename);

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

            const fileContent = req.file.buffer.toString('utf-8');
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
            });

            let imported = 0;
            const errors: string[] = [];

            for (let i = 0; i < records.length; i++) {
                const row = records[i];
                try {
                    if (row.categoryId) {
                        const category = await prisma.category.findUnique({
                            where: { id: row.categoryId },
                        });
                        if (!category) {
                            errors.push(`Row ${i + 1}: Category ID ${row.categoryId} not found`);
                            continue;
                        }
                    }

                    let characteristics = {};
                    try {
                        if (row.characteristics) characteristics = JSON.parse(row.characteristics);
                    } catch (e) {
                        errors.push(`Row ${i + 1}: Invalid JSON in characteristics`);
                        continue;
                    }

                    await prisma.product.create({
                        data: {
                            sku: row.sku,
                            baseName: row.baseName,
                            categoryId: row.categoryId || null,
                            barcode: row.barcode || null,
                            status: row.status || 'DRAFT',
                            characteristics,
                            vendorId: req.vendorId!,
                        },
                    });
                    imported++;
                } catch (e: any) {
                    errors.push(`Row ${i + 1}: ${e.message}`);
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

            const csvData = products.map((p) => ({
                id: p.id,
                sku: p.sku,
                baseName: p.baseName,
                categoryId: p.categoryId,
                categoryName: p.category?.name || '',
                barcode: p.barcode,
                status: p.status,
                characteristics: JSON.stringify(p.characteristics),
                createdAt: p.createdAt.toISOString(),
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
