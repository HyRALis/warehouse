import prisma, { Prisma, type PrismaClient } from '../src/index.js';
import { SYSTEM_CATEGORIES, SYSTEM_TEMPLATES, validateSystemCatalog } from './system-catalog';

function templateSearchText(name: string, key: string, fields: unknown): string {
    return `${name} ${key} ${JSON.stringify(fields)}`.toLowerCase();
}

function categorySearchText(
    name: string,
    code: string,
    aliases: string[],
    rootName?: string
): string {
    return [name, rootName, code, ...aliases].filter(Boolean).join(' ').toLowerCase();
}

export async function seedSystemCatalog(client: PrismaClient = prisma): Promise<void> {
    validateSystemCatalog();

    await client.$transaction(async (tx) => {
        const templateIds = new Map<string, string>();
        for (const template of SYSTEM_TEMPLATES) {
            const record = await tx.characteristicTemplate.upsert({
                where: { key: template.key },
                create: {
                    vendorProfileId: null,
                    key: template.key,
                    name: template.name,
                    fields: template.fields as Prisma.InputJsonValue,
                    searchText: templateSearchText(template.name, template.key, template.fields),
                },
                update: {
                    vendorProfileId: null,
                    name: template.name,
                    fields: template.fields as Prisma.InputJsonValue,
                    searchText: templateSearchText(template.name, template.key, template.fields),
                },
            });
            templateIds.set(template.key, record.id);
        }

        for (const root of SYSTEM_CATEGORIES) {
            const rootRecord = await tx.category.upsert({
                where: { code: root.code },
                create: {
                    code: root.code,
                    name: root.name,
                    aliases: root.aliases,
                    searchText: categorySearchText(root.name, root.code, root.aliases),
                    vendorProfileId: null,
                    parentId: null,
                    defaultTemplateId: templateIds.get(root.defaultTemplateKey)!,
                },
                update: {
                    name: root.name,
                    aliases: root.aliases,
                    searchText: categorySearchText(root.name, root.code, root.aliases),
                    vendorProfileId: null,
                    parentId: null,
                    defaultTemplateId: templateIds.get(root.defaultTemplateKey)!,
                },
            });

            for (const category of root.children) {
                await tx.category.upsert({
                    where: { code: category.code },
                    create: {
                        code: category.code,
                        name: category.name,
                        aliases: category.aliases,
                        searchText: categorySearchText(
                            category.name,
                            category.code,
                            category.aliases,
                            root.name
                        ),
                        vendorProfileId: null,
                        parentId: rootRecord.id,
                        defaultTemplateId: templateIds.get(category.defaultTemplateKey)!,
                    },
                    update: {
                        name: category.name,
                        aliases: category.aliases,
                        searchText: categorySearchText(
                            category.name,
                            category.code,
                            category.aliases,
                            root.name
                        ),
                        vendorProfileId: null,
                        parentId: rootRecord.id,
                        defaultTemplateId: templateIds.get(category.defaultTemplateKey)!,
                    },
                });
            }
        }
    });
}

/**
 * Seeds the read-only system taxonomy and characteristic templates.
 */
async function main(): Promise<void> {
    await seedSystemCatalog();
    console.log('System catalog seeded: 126 categories and 12 templates.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
