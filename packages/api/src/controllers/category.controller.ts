import { Response, NextFunction } from 'express';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';

const categorySearchText = (name: string): string => name.trim().toLocaleLowerCase();

export class CategoryController {
    /**
     * List categories
     */
    static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const categories = await prisma.category.findMany({
                where: {
                    OR: [{ vendorId: null }, { vendorId: req.vendorId }],
                },
                include: {
                    children: true,
                    defaultTemplate: {
                        select: { id: true, key: true, name: true, fields: true },
                    },
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
            const { name, parentId } = req.body;

            if (parentId) {
                const parent = await prisma.category.findFirst({
                    where: {
                        id: parentId,
                        OR: [{ vendorId: null }, { vendorId: req.vendorId }],
                    },
                    select: { id: true },
                });

                if (!parent) {
                    res.status(400).json({
                        success: false,
                        message: 'Parent category is not available',
                    });
                    return;
                }
            }

            const category = await prisma.category.create({
                data: {
                    name,
                    parentId,
                    vendorId: req.vendorId!,
                    searchText: categorySearchText(name),
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
            const { name } = req.body;

            const category = await prisma.category.findUnique({ where: { id } });

            if (!category) {
                res.status(404).json({ success: false, message: 'Category not found' });
                return;
            }

            if (category.vendorId !== req.vendorId || category.vendorId === null) {
                res.status(403).json({
                    success: false,
                    message: 'Cannot edit system category or category owned by another vendor',
                });
                return;
            }

            const updatedCategory = await prisma.category.update({
                where: { id },
                data: { name, searchText: categorySearchText(name) },
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

            const category = await prisma.category.findUnique({ where: { id } });

            if (!category) {
                res.status(404).json({ success: false, message: 'Category not found' });
                return;
            }

            if (category.vendorId !== req.vendorId || category.vendorId === null) {
                res.status(403).json({
                    success: false,
                    message: 'Cannot delete system category or category owned by another vendor',
                });
                return;
            }

            const productsCount = await prisma.product.count({ where: { categoryId: id } });
            if (productsCount > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with associated products',
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
