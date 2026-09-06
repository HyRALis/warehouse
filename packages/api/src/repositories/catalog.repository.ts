import prisma from '@inventory-system/database';

/**
 * Categories and templates are visible when they are system-owned (`vendorProfileId: null`) or
 * owned by the caller. Resolving that in one place keeps the tenancy predicate identical
 * everywhere; a lookup that omits the profile leaks another vendor's catalog.
 */
const availableTo = (id: string, vendorProfileId: string) => ({
    id,
    OR: [{ vendorProfileId: null }, { vendorProfileId }],
});

export const findAvailableCategory = (id: string, vendorProfileId: string) =>
    prisma.category.findFirst({ where: availableTo(id, vendorProfileId) });

export const findAvailableTemplate = (id: string, vendorProfileId: string) =>
    prisma.characteristicTemplate.findFirst({ where: availableTo(id, vendorProfileId) });

export const findAvailableTemplateId = (id: string, vendorProfileId: string) =>
    prisma.characteristicTemplate.findFirst({
        where: availableTo(id, vendorProfileId),
        select: { id: true },
    });

const templateCounts = (vendorProfileId: string) => ({
    _count: {
        select: {
            defaultForCategories: {
                where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] },
            },
        },
    },
});

export const listAvailableCategories = (vendorProfileId: string, database = prisma) =>
    database.category.findMany({
        where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] },
        include: {
            parent: { select: { id: true, name: true } },
            defaultTemplate: { select: { id: true, key: true, name: true, fields: true } },
            _count: {
                select: {
                    products: { where: { vendorProfileId, deletedAt: null } },
                    children: { where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] } },
                },
            },
        },
        orderBy: { name: 'asc' },
    });

export const listAvailableTemplates = (vendorProfileId: string, database = prisma) =>
    database.characteristicTemplate.findMany({
        where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] },
        include: templateCounts(vendorProfileId),
        orderBy: [{ vendorProfileId: 'asc' }, { name: 'asc' }],
    });

export const findAvailableTemplateWithCounts = (
    id: string,
    vendorProfileId: string,
    database = prisma
) =>
    database.characteristicTemplate.findFirst({
        where: availableTo(id, vendorProfileId),
        include: templateCounts(vendorProfileId),
    });
