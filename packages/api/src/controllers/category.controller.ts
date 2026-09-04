import { Response, NextFunction } from 'express';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import {
    findAvailableCategory,
    findAvailableTemplateId,
} from '../repositories/catalog.repository';
import { categorySearchText } from '../domain/catalog-search-text';

export class CategoryController {
    /**
     * List categories
     */
    static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const categories = await prisma.category.findMany({
                where: {
                    OR: [{ vendorProfileId: null }, { vendorProfileId: req.vendorProfileId }],
                },
                include: {
                    parent: { select: { id: true, name: true } },
                    defaultTemplate: {
                        select: { id: true, key: true, name: true, fields: true },
                    },
                    _count: { select: { products: true, children: true } },
                },
                orderBy: {
                    name: 'asc',
                },
            });
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a category
     */
    static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, parentId, defaultTemplateId, aliases = [] } = req.body;
            let parentName: string | undefined;

            if (parentId) {
                const parent = await prisma.category.findFirst({
                    where: {
                        id: parentId,
                        OR: [{ vendorProfileId: null }, { vendorProfileId: req.vendorProfileId }],
                    },
                    select: { id: true, name: true },
                });

                if (!parent) {
                    res.status(400).json({
                        success: false,
                        message: 'Parent category is not available',
                    });
                    return;
                }
                parentName = parent.name;
            }

            if (
                defaultTemplateId &&
                !(await findAvailableTemplateId(defaultTemplateId, req.vendorProfileId!))
            ) {
                res.status(400).json({
                    success: false,
                    code: 'TEMPLATE_NOT_AVAILABLE',
                    message: 'Default template is not available',
                });
                return;
            }

            const category = await prisma.category.create({
                data: {
                    name,
                    parentId,
                    defaultTemplateId,
                    aliases,
                    vendorId: req.vendorId!,
                    vendorProfileId: req.vendorProfileId!,
                    searchText: categorySearchText(name, aliases, parentName),
                },
            });
            res.status(201).json({ success: true, data: category });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a category
     */
    static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { name, parentId, defaultTemplateId, aliases } = req.body;

            const category = await findAvailableCategory(id, req.vendorProfileId!);

            if (!category) {
                res.status(404).json({ success: false, message: 'Category not found' });
                return;
            }

            if (category.vendorProfileId === null) {
                res.status(403).json({
                    success: false,
                    code: 'SYSTEM_CATEGORY_READ_ONLY',
                    message: 'System categories are read-only',
                });
                return;
            }

            if (parentId === id) {
                res.status(400).json({
                    success: false,
                    message: 'A category cannot be its own parent',
                });
                return;
            }

            let parentName: string | undefined;
            if (parentId) {
                let parent = await prisma.category.findFirst({
                    where: {
                        id: parentId,
                        OR: [{ vendorProfileId: null }, { vendorProfileId: req.vendorProfileId }],
                    },
                    select: { id: true, name: true, parentId: true },
                });
                if (!parent) {
                    res.status(400).json({
                        success: false,
                        message: 'Parent category is not available',
                    });
                    return;
                }
                parentName = parent.name;
                while (parent) {
                    if (parent.id === id) {
                        res.status(400).json({
                            success: false,
                            message: 'A category cannot be moved below one of its subcategories',
                        });
                        return;
                    }
                    if (!parent.parentId) break;
                    parent = await prisma.category.findFirst({
                        where: {
                            id: parent.parentId,
                            OR: [
                                { vendorProfileId: null },
                                { vendorProfileId: req.vendorProfileId },
                            ],
                        },
                        select: { id: true, name: true, parentId: true },
                    });
                }
            } else if (parentId === undefined && category.parentId) {
                const currentParent = await prisma.category.findUnique({
                    where: { id: category.parentId },
                    select: { name: true },
                });
                parentName = currentParent?.name;
            }

            if (
                defaultTemplateId &&
                !(await findAvailableTemplateId(defaultTemplateId, req.vendorProfileId!))
            ) {
                res.status(400).json({
                    success: false,
                    message: 'Default template is not available',
                });
                return;
            }

            const nextName = name ?? category.name;
            const nextAliases = aliases ?? category.aliases;

            const updatedCategory = await prisma.category.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(parentId !== undefined && { parentId }),
                    ...(defaultTemplateId !== undefined && { defaultTemplateId }),
                    ...(aliases !== undefined && { aliases }),
                    searchText: categorySearchText(nextName, nextAliases, parentName),
                },
            });

            res.status(200).json({ success: true, data: updatedCategory });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a category
     */
    static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const category = await findAvailableCategory(id, req.vendorProfileId!);

            if (!category) {
                res.status(404).json({ success: false, message: 'Category not found' });
                return;
            }

            if (category.vendorProfileId === null) {
                res.status(403).json({
                    success: false,
                    code: 'SYSTEM_CATEGORY_READ_ONLY',
                    message: 'System categories are read-only',
                });
                return;
            }

            const [productsCount, childrenCount] = await Promise.all([
                prisma.product.count({ where: { categoryId: id } }),
                prisma.category.count({ where: { parentId: id } }),
            ]);
            if (productsCount > 0 || childrenCount > 0) {
                res.status(409).json({
                    success: false,
                    code: 'CATEGORY_IN_USE',
                    message: 'Move linked products and subcategories before deleting this category',
                    details: { productsCount, childrenCount },
                });
                return;
            }

            await prisma.category.delete({ where: { id } });

            res.status(200).json({ success: true, message: 'Category deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
