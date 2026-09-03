import { Response, NextFunction } from 'express';
import prisma, { Prisma } from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';

const templateSearchText = (name: string, fields: unknown): string =>
    `${name} ${JSON.stringify(fields)}`.trim().toLocaleLowerCase();

const findAvailableTemplate = (id: string, vendorProfileId: string) =>
    prisma.characteristicTemplate.findFirst({
        where: { id, OR: [{ vendorProfileId: null }, { vendorProfileId }] },
    });

export class TemplateController {
    /**
     * List templates
     */
    static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const templates = await prisma.characteristicTemplate.findMany({
                where: {
                    OR: [{ vendorProfileId: null }, { vendorProfileId: req.vendorProfileId }],
                },
                include: { _count: { select: { defaultForCategories: true } } },
                orderBy: [{ vendorProfileId: 'asc' }, { name: 'asc' }],
            });
            res.status(200).json({ success: true, data: templates });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get template by id
     */
    static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const template = await prisma.characteristicTemplate.findFirst({
                where: {
                    id,
                    OR: [{ vendorProfileId: null }, { vendorProfileId: req.vendorProfileId }],
                },
                include: { _count: { select: { defaultForCategories: true } } },
            });

            if (!template) {
                res.status(404).json({ success: false, message: 'Template not found' });
                return;
            }

            res.status(200).json({ success: true, data: template });
        } catch (error) {
            next(error);
        }
    }

    /** Duplicate an available system template into the vendor's editable catalog. */
    static async duplicate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const source = await prisma.characteristicTemplate.findFirst({
                where: { id: req.params.id, vendorProfileId: null },
            });
            if (!source) {
                res.status(404).json({ success: false, message: 'System template not found' });
                return;
            }

            const name = req.body.name || `${source.name} copy`;
            const template = await prisma.characteristicTemplate.create({
                data: {
                    vendorProfileId: req.vendorProfileId!,
                    name,
                    fields: source.fields as Prisma.InputJsonValue,
                    searchText: templateSearchText(name, source.fields),
                },
            });
            res.status(201).json({ success: true, data: template });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create template
     */
    static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, fields } = req.body;
            const template = await prisma.characteristicTemplate.create({
                data: {
                    name,
                    fields,
                    vendorProfileId: req.vendorProfileId!,
                    searchText: templateSearchText(name, fields),
                },
            });
            res.status(201).json({ success: true, data: template });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update template
     */
    static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { name, fields } = req.body;

            const template = await findAvailableTemplate(id, req.vendorProfileId!);

            if (!template) {
                res.status(404).json({ success: false, message: 'Template not found' });
                return;
            }
            if (template.vendorProfileId === null) {
                res.status(403).json({
                    success: false,
                    code: 'SYSTEM_TEMPLATE_READ_ONLY',
                    message: 'System templates are read-only',
                });
                return;
            }

            const nextName = name ?? template.name;
            const nextFields = fields ?? template.fields;

            const updatedTemplate = await prisma.characteristicTemplate.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(fields !== undefined && { fields }),
                    searchText: templateSearchText(nextName, nextFields),
                },
            });

            res.status(200).json({ success: true, data: updatedTemplate });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete template
     */
    static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const template = await findAvailableTemplate(id, req.vendorProfileId!);

            if (!template) {
                res.status(404).json({ success: false, message: 'Template not found' });
                return;
            }

            if (template.vendorProfileId === null) {
                res.status(403).json({
                    success: false,
                    code: 'SYSTEM_TEMPLATE_READ_ONLY',
                    message: 'System templates are read-only',
                });
                return;
            }

            const categoriesCount = await prisma.category.count({
                where: { defaultTemplateId: id },
            });
            if (categoriesCount > 0) {
                res.status(409).json({
                    success: false,
                    code: 'TEMPLATE_IN_USE',
                    message:
                        'Choose another default template for linked categories before deleting',
                    details: { categoriesCount },
                });
                return;
            }

            await prisma.characteristicTemplate.delete({ where: { id } });

            res.status(200).json({ success: true, message: 'Template deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
