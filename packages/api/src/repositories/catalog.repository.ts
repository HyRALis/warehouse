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

const templateCounts = { _count: { select: { defaultForCategories: true } } };

export const listAvailableTemplates = (vendorProfileId: string) =>
    prisma.characteristicTemplate.findMany({
        where: { OR: [{ vendorProfileId: null }, { vendorProfileId }] },
        include: templateCounts,
        orderBy: [{ vendorProfileId: 'asc' }, { name: 'asc' }],
    });

export const findAvailableTemplateWithCounts = (id: string, vendorProfileId: string) =>
    prisma.characteristicTemplate.findFirst({
        where: availableTo(id, vendorProfileId),
        include: templateCounts,
    });
