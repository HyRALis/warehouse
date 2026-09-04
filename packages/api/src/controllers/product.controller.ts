import { Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import prisma, { Prisma, ProductStatus } from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { StorageService } from '../services/storage.service';
import { QRCodeService } from '../services/qrcode.service';
import type { CsvImportErrorCode, CsvImportRowError } from '@inventory-system/contracts';

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

const getEffectiveStatus = (productStatus: ProductStatus, versionStatus: ProductStatus) => {
    if (
        productStatus === ProductStatus.DISCONTINUED ||
        versionStatus === ProductStatus.DISCONTINUED
    ) {
        return ProductStatus.DISCONTINUED;
    }
    return productStatus === ProductStatus.ACTIVE && versionStatus === ProductStatus.ACTIVE
        ? ProductStatus.ACTIVE
        : ProductStatus.DRAFT;
};

const serializeProduct = <
    T extends {
        status: ProductStatus;
        versions?: Array<{ isPrimary: boolean; status: ProductStatus }>;
        _count?: { versions: number };
    },
>(
    product: T
) => {
    const versions = (product.versions || []).map((version) => ({
        ...version,
        effectiveStatus: getEffectiveStatus(product.status, version.status),
        canDelete: !version.isPrimary,
    }));
    return {
        ...product,
        versions,
        versionCount: product._count?.versions ?? versions.length,
        primaryVersion: versions.find((version) => version.isPrimary) || versions[0] || null,
    };
};

const buildSearchText = (...values: Array<string | null | undefined>) =>
    values.filter(Boolean).join(' ').trim().toLowerCase();

interface NormalizedCsvRow {
    row: number;
    groupKey: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    productStatus: ProductStatus;
    versionLabel: string;
    versionStatus: ProductStatus;
    sku: string;
    barcode: string | null;
    characteristics: Prisma.InputJsonValue;
    designNotes: string | null;
    isPrimary: boolean | null;
}

const normalizeCsvValue = (value?: string) => value?.trim() || '';

const parseCsvStatus = (value: string, fallback: ProductStatus): ProductStatus | null => {
    const normalized = (value || fallback).toUpperCase();
    return Object.values(ProductStatus).includes(normalized as ProductStatus)
        ? (normalized as ProductStatus)
        : null;
};

const parseCsvBoolean = (value: string): boolean | null => {
    if (!value) return null;
    if (['true', 'yes', '1'].includes(value.toLowerCase())) return true;
    if (['false', 'no', '0'].includes(value.toLowerCase())) return false;
    return null;
};

const csvRowError = (
    row: number,
    code: CsvImportErrorCode,
    message: string,
    field?: string,
    value?: string
): CsvImportRowError => ({ row, code, message, ...(field && { field }), ...(value && { value }) });

const generateSku = async (vendorProfileId: string, baseName: string): Promise<string> => {
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
            prisma.product.findFirst({
                where: { vendorProfileId, sku: candidate },
                select: { id: true },
            }),
            prisma.productVersion.findFirst({
                where: { vendorProfileId, sku: candidate },
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
                vendorProfileId: req.vendorProfileId,
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
                where: { id, vendorProfileId: req.vendorProfileId, deletedAt: null },
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
            const vendorProfileId = req.vendorProfileId!;

            const category = await prisma.category.findFirst({
                where: {
                    id: categoryId,
                    OR: [{ vendorProfileId: null }, { vendorProfileId }],
                },
                select: { id: true, name: true },
            });

            if (!category) {
                res.status(400).json({ success: false, message: 'Category is not available' });
                return;
            }

            const parsedCharacteristics: Prisma.InputJsonValue =
                typeof characteristics === 'string' ? JSON.parse(characteristics) : characteristics;
            const resolvedSku = sku?.trim() || (await generateSku(vendorProfileId, baseName));
            const resolvedProductStatus: ProductStatus =
                productStatus || status || ProductStatus.DRAFT;
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
                        vendorProfileId,
                    },
                });

                const initialVersion = await tx.productVersion.create({
                    data: {
                        productId: newProduct.id,
                        vendorId,
                        vendorProfileId,
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
            const vendorProfileId = req.vendorProfileId!;

            const product = await prisma.product.findFirst({
                where: { id, vendorProfileId, deletedAt: null },
                include: { category: { select: { name: true } } },
            });

            if (!product) {
                res.status(404).json({ success: false, message: 'Product not found' });
                return;
            }

            let categoryName = product.category.name;
            if (categoryId !== undefined) {
                const category = await prisma.category.findFirst({
                    where: {
                        id: categoryId,
                        OR: [{ vendorProfileId: null }, { vendorProfileId }],
                    },
                    select: { id: true, name: true },
                });

                if (!category) {
                    res.status(400).json({ success: false, message: 'Category is not available' });
                    return;
                }
                categoryName = category.name;
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
                    searchText: buildSearchText(
                        baseName ?? product.baseName,
                        sku ?? product.sku,
                        barcode === undefined ? product.barcode : barcode,
                        categoryName
                    ),
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
                where: { id, vendorProfileId: req.vendorProfileId, deletedAt: null },
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
                where: { id, vendorProfileId: req.vendorProfileId, deletedAt: null },
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
                where: { id, vendorProfileId: req.vendorProfileId, deletedAt: null },
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

            await prisma.productImage.delete({ where: { id: imageId } });

            const remainingReferences = await prisma.productImage.count({
                where: { imageUrl: productImage.imageUrl },
            });
            if (remainingReferences === 0) {
                await StorageService.deleteFile(productImage.imageUrl);
            }

            if (product.imageUrl === productImage.imageUrl) {
                const nextPrimaryImage = await prisma.productImage.findFirst({
                    where: {
                        productId: id,
                        productVersion: { isPrimary: true, deletedAt: null },
                    },
                    orderBy: { sortOrder: 'asc' },
                    select: { imageUrl: true },
                });
                await prisma.product.update({
                    where: { id },
                    data: { imageUrl: nextPrimaryImage?.imageUrl || null },
                });
            }

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
                res.status(400).json({
                    success: false,
                    code: 'CSV_FILE_REQUIRED',
                    message: 'No CSV file provided',
                });
                return;
            }

            let records: Record<string, string>[];
            try {
                records = parse(req.file.buffer.toString('utf-8'), {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    bom: true,
                }) as Record<string, string>[];
            } catch {
                res.status(400).json({
                    success: false,
                    code: 'CSV_PARSE_ERROR',
                    message: 'The CSV file could not be parsed',
                });
                return;
            }

            if (records.length > 1000) {
                res.status(400).json({
                    success: false,
                    code: 'CSV_ROW_LIMIT_EXCEEDED',
                    message: 'A CSV import is limited to 1,000 rows',
                });
                return;
            }
            if (records.length === 0) {
                res.status(400).json({
                    success: false,
                    code: 'CSV_EMPTY',
                    message: 'The CSV file has no product rows',
                });
                return;
            }

            const vendorId = req.vendorId!;
            const vendorProfileId = req.vendorProfileId!;
            const categories =
                (await prisma.category.findMany({
                    where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] },
                    select: { id: true, code: true, name: true },
                })) || [];
            const categoriesByCode = new Map<string, (typeof categories)[number]>();
            const categoriesByName = new Map<string, typeof categories>();
            for (const category of categories) {
                if (category.code) categoriesByCode.set(category.code.toLowerCase(), category);
                const key = category.name.toLowerCase();
                categoriesByName.set(key, [...(categoriesByName.get(key) || []), category]);
            }

            const errors: CsvImportRowError[] = [];
            const normalizedRows: NormalizedCsvRow[] = [];
            const invalidGroups = new Set<string>();
            const seenSkus = new Map<string, number>();
            const seenBarcodes = new Map<string, number>();

            for (let i = 0; i < records.length; i++) {
                const row = records[i];
                const rowNumber = i + 2;
                const productName = normalizeCsvValue(row.productName || row.baseName);
                const sku = normalizeCsvValue(row.sku);
                const groupKey =
                    normalizeCsvValue(row.productReference) || `name:${productName.toLowerCase()}`;
                const fail = (
                    code: CsvImportErrorCode,
                    message: string,
                    field?: string,
                    value?: string
                ) => {
                    errors.push(csvRowError(rowNumber, code, message, field, value));
                    if (groupKey && productName) invalidGroups.add(groupKey);
                };

                if (!productName) fail('REQUIRED_FIELD', 'Product name is required', 'productName');
                if (!sku) fail('REQUIRED_FIELD', 'Version SKU is required', 'sku');
                if (!productName || !sku) continue;

                let category: (typeof categories)[number] | undefined;
                const categoryId = normalizeCsvValue(row.categoryId);
                const categoryCode = normalizeCsvValue(row.categoryCode).toLowerCase();
                const categoryName = normalizeCsvValue(row.categoryName).toLowerCase();
                if (categoryId)
                    category = categories.find((candidate) => candidate.id === categoryId);
                else if (categoryCode) category = categoriesByCode.get(categoryCode);
                else if (categoryName) {
                    const matches = categoriesByName.get(categoryName) || [];
                    if (matches.length > 1) {
                        fail(
                            'CATEGORY_AMBIGUOUS',
                            'Category name matches multiple available categories; use categoryCode',
                            'categoryName',
                            row.categoryName
                        );
                        continue;
                    }
                    category = matches[0];
                }
                if (!category) {
                    const categoryField = categoryId
                        ? 'categoryId'
                        : categoryCode
                          ? 'categoryCode'
                          : 'categoryName';
                    fail(
                        'CATEGORY_NOT_AVAILABLE',
                        'Category code or name is not available',
                        categoryField,
                        row.categoryId || row.categoryCode || row.categoryName
                    );
                    continue;
                }

                const productStatus = parseCsvStatus(
                    normalizeCsvValue(row.productStatus || row.status),
                    ProductStatus.DRAFT
                );
                if (!productStatus) {
                    fail(
                        'INVALID_PRODUCT_STATUS',
                        'Product status must be DRAFT, ACTIVE, or DISCONTINUED',
                        'productStatus',
                        row.productStatus || row.status
                    );
                    continue;
                }
                const versionStatus = parseCsvStatus(
                    normalizeCsvValue(row.versionStatus),
                    ProductStatus.DRAFT
                );
                if (!versionStatus) {
                    fail(
                        'INVALID_VERSION_STATUS',
                        'Version status must be DRAFT, ACTIVE, or DISCONTINUED',
                        'versionStatus',
                        row.versionStatus
                    );
                    continue;
                }

                let characteristics: Prisma.InputJsonValue = [];
                try {
                    if (normalizeCsvValue(row.characteristics)) {
                        const parsed = JSON.parse(row.characteristics);
                        if (!Array.isArray(parsed))
                            throw new Error('Characteristics must be an array');
                        characteristics = parsed;
                    }
                } catch {
                    fail(
                        'INVALID_CHARACTERISTICS',
                        'Characteristics must be a valid JSON array',
                        'characteristics'
                    );
                    continue;
                }

                const primaryValue = normalizeCsvValue(row.isPrimary);
                const isPrimary = parseCsvBoolean(primaryValue);
                if (primaryValue && isPrimary === null) {
                    fail(
                        'INVALID_PRIMARY_FLAG',
                        'isPrimary must be true or false',
                        'isPrimary',
                        row.isPrimary
                    );
                    continue;
                }

                const normalizedSku = sku.toLowerCase();
                if (seenSkus.has(normalizedSku)) {
                    fail(
                        'IDENTIFIER_CONFLICT',
                        `SKU duplicates row ${seenSkus.get(normalizedSku)}`,
                        'sku',
                        sku
                    );
                    continue;
                }
                seenSkus.set(normalizedSku, rowNumber);

                const barcode = normalizeCsvValue(row.barcode);
                if (barcode) {
                    const normalizedBarcode = barcode.toLowerCase();
                    if (seenBarcodes.has(normalizedBarcode)) {
                        fail(
                            'IDENTIFIER_CONFLICT',
                            `Barcode duplicates row ${seenBarcodes.get(normalizedBarcode)}`,
                            'barcode',
                            barcode
                        );
                        continue;
                    }
                    seenBarcodes.set(normalizedBarcode, rowNumber);
                }

                normalizedRows.push({
                    row: rowNumber,
                    groupKey,
                    productName,
                    categoryId: category.id,
                    categoryName: category.name,
                    productStatus,
                    versionLabel: normalizeCsvValue(row.versionLabel) || 'Original',
                    versionStatus,
                    sku,
                    barcode: barcode || null,
                    characteristics,
                    designNotes: normalizeCsvValue(row.designNotes) || null,
                    isPrimary,
                });
            }

            const groups = new Map<string, NormalizedCsvRow[]>();
            for (const row of normalizedRows)
                groups.set(row.groupKey, [...(groups.get(row.groupKey) || []), row]);
            for (const [groupKey, rows] of groups) {
                const first = rows[0];
                const inconsistent = rows.some(
                    (row) =>
                        row.productName !== first.productName ||
                        row.categoryId !== first.categoryId ||
                        row.productStatus !== first.productStatus
                );
                if (inconsistent) {
                    invalidGroups.add(groupKey);
                    for (const row of rows)
                        errors.push(
                            csvRowError(
                                row.row,
                                'PRODUCT_CONFLICT',
                                'Rows with the same productReference must use the same product name, category, and product status'
                            )
                        );
                }
                if (rows.filter((row) => row.isPrimary === true).length > 1) {
                    invalidGroups.add(groupKey);
                    for (const row of rows.filter((row) => row.isPrimary === true))
                        errors.push(
                            csvRowError(
                                row.row,
                                'MULTIPLE_PRIMARY_VERSIONS',
                                'Only one version can be primary for a product',
                                'isPrimary'
                            )
                        );
                }
            }

            const candidateRows = normalizedRows.filter((row) => !invalidGroups.has(row.groupKey));
            const skus = candidateRows.map((row) => row.sku);
            const barcodes = candidateRows
                .map((row) => row.barcode)
                .filter((value): value is string => Boolean(value));
            const [existingProductsRaw, existingVersionsRaw] = await Promise.all([
                prisma.product.findMany({
                    where: {
                        vendorProfileId,
                        deletedAt: null,
                        OR: [
                            { sku: { in: skus } },
                            ...(barcodes.length ? [{ barcode: { in: barcodes } }] : []),
                        ],
                    },
                    select: { sku: true, barcode: true },
                }),
                prisma.productVersion.findMany({
                    where: {
                        vendorProfileId,
                        deletedAt: null,
                        OR: [
                            { sku: { in: skus } },
                            ...(barcodes.length ? [{ barcode: { in: barcodes } }] : []),
                        ],
                    },
                    select: { sku: true, barcode: true },
                }),
            ]);
            const existingProducts = existingProductsRaw || [];
            const existingVersions = existingVersionsRaw || [];
            for (const row of candidateRows) {
                if (
                    existingProducts.some(
                        (item) =>
                            item.sku === row.sku || (row.barcode && item.barcode === row.barcode)
                    ) ||
                    existingVersions.some(
                        (item) =>
                            item.sku === row.sku || (row.barcode && item.barcode === row.barcode)
                    )
                ) {
                    invalidGroups.add(row.groupKey);
                    errors.push(
                        csvRowError(
                            row.row,
                            'IDENTIFIER_CONFLICT',
                            'SKU or barcode is already used by this vendor',
                            row.barcode ? 'sku/barcode' : 'sku',
                            row.sku
                        )
                    );
                }
            }

            for (const [groupKey, rows] of groups) {
                if (!invalidGroups.has(groupKey)) continue;
                for (const row of rows) {
                    if (!errors.some((error) => error.row === row.row))
                        errors.push(
                            csvRowError(
                                row.row,
                                'PRODUCT_CONFLICT',
                                'This product was skipped because another version row is invalid'
                            )
                        );
                }
            }

            let importedProducts = 0;
            let importedVersions = 0;
            for (const [groupKey, rows] of groups) {
                if (invalidGroups.has(groupKey)) continue;
                const primary = rows.find((row) => row.isPrimary === true) || rows[0];
                try {
                    const created = await prisma.$transaction(
                        async (tx: Prisma.TransactionClient) => {
                            const product = await tx.product.create({
                                data: {
                                    vendorId,
                                    vendorProfileId,
                                    categoryId: primary.categoryId,
                                    baseName: primary.productName,
                                    sku: primary.sku,
                                    barcode: primary.barcode,
                                    status: primary.productStatus,
                                    characteristics: primary.characteristics,
                                    searchText: buildSearchText(
                                        primary.productName,
                                        primary.sku,
                                        primary.barcode,
                                        primary.categoryName
                                    ),
                                },
                            });
                            const versions: Array<{ id: string; isPrimary: boolean }> = [];
                            for (let index = 0; index < rows.length; index += 1) {
                                const row = rows[index];
                                versions.push(
                                    await tx.productVersion.create({
                                        data: {
                                            productId: product.id,
                                            vendorId,
                                            vendorProfileId,
                                            versionNumber: index + 1,
                                            label: row.versionLabel,
                                            sku: row.sku,
                                            barcode: row.barcode,
                                            status: row.versionStatus,
                                            characteristics: row.characteristics,
                                            designNotes: row.designNotes,
                                            isPrimary: row === primary,
                                            searchText: buildSearchText(
                                                row.productName,
                                                row.versionLabel,
                                                row.sku,
                                                row.barcode,
                                                row.categoryName
                                            ),
                                        },
                                    })
                                );
                            }
                            return { productId: product.id, versions };
                        }
                    );

                    for (const version of created.versions) {
                        try {
                            const qrCodeUrl = await QRCodeService.generateQRCode(version.id);
                            await prisma.productVersion.update({
                                where: { id: version.id },
                                data: { qrCodeUrl },
                            });
                            if (version.isPrimary)
                                await prisma.product.update({
                                    where: { id: created.productId },
                                    data: { qrCodeUrl },
                                });
                        } catch {
                            // Optional QR rendering must not roll back an otherwise valid CSV import.
                        }
                    }
                    importedProducts += 1;
                    importedVersions += rows.length;
                } catch (error) {
                    const code: CsvImportErrorCode =
                        (error as { code?: string }).code === 'P2002'
                            ? 'IDENTIFIER_CONFLICT'
                            : 'IMPORT_FAILED';
                    const message =
                        code === 'IDENTIFIER_CONFLICT'
                            ? 'SKU or barcode is already used by this vendor'
                            : 'The product could not be imported';
                    for (const row of rows) errors.push(csvRowError(row.row, code, message));
                }
            }

            errors.sort((left, right) => left.row - right.row);
            const failedRows = new Set(errors.map((error) => error.row)).size;

            res.status(200).json({
                success: true,
                message: errors.length ? 'Import completed with row errors' : 'Import completed',
                data: {
                    imported: importedProducts,
                    importedProducts,
                    importedVersions,
                    failedRows,
                    errors,
                },
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
                where: { vendorProfileId: req.vendorProfileId, deletedAt: null },
                include: {
                    category: true,
                    versions: { where: { deletedAt: null }, orderBy: { versionNumber: 'asc' } },
                },
                orderBy: [{ baseName: 'asc' }, { createdAt: 'asc' }],
            });

            const csvData = products.flatMap((product) =>
                product.versions.map((version) => ({
                    productReference: product.id,
                    productName: product.baseName,
                    categoryCode: product.category?.code || '',
                    categoryName: product.category?.name || '',
                    productStatus: product.status,
                    versionLabel: version.label,
                    versionStatus: version.status,
                    sku: version.sku,
                    barcode: version.barcode || '',
                    characteristics: JSON.stringify(version.characteristics),
                    designNotes: version.designNotes || '',
                    isPrimary: version.isPrimary,
                }))
            );

            const csvString = stringify(csvData, { header: true });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
            res.status(200).send(csvString);
        } catch (error) {
            next(error);
        }
    }
}
