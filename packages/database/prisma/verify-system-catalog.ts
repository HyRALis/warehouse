import { PrismaClient } from '@prisma/client';
import { SYSTEM_CATEGORIES, SYSTEM_TEMPLATES, validateSystemCatalog } from './system-catalog';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    validateSystemCatalog();
    const codes = SYSTEM_CATEGORIES.flatMap((root) => [root.code, ...root.children.map((item) => item.code)]);
    const keys = SYSTEM_TEMPLATES.map((template) => template.key);

    const [categories, templates] = await Promise.all([
        prisma.category.findMany({
            where: { vendorId: null, code: { in: codes } },
            select: { code: true, parentId: true, defaultTemplateId: true },
        }),
        prisma.characteristicTemplate.findMany({
            where: { vendorId: null, key: { in: keys } },
            select: { id: true, key: true },
        }),
    ]);

    if (categories.length !== 126) throw new Error(`Expected 126 system categories, found ${categories.length}`);
    if (templates.length !== 12) throw new Error(`Expected 12 system templates, found ${templates.length}`);
    if (categories.filter((category) => category.parentId === null).length !== 14) throw new Error('Expected 14 system root categories');
    if (categories.filter((category) => category.parentId !== null).length !== 112) throw new Error('Expected 112 selectable system child categories');
    if (categories.some((category) => category.defaultTemplateId === null)) throw new Error('Every system category must have a default template');

    const templateIds = new Set(templates.map((template) => template.id));
    if (categories.some((category) => !templateIds.has(category.defaultTemplateId!))) throw new Error('A system category points to a non-system template');

    console.log('System catalog verified: 14 roots, 112 children, 126 total categories, and 12 templates.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
