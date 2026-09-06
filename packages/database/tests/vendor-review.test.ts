import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { startReviewDatabase } from './helpers/review-database.js';
import {
    listAvailableCategories,
    listAvailableTemplates,
    findAvailableTemplateWithCounts,
} from '../../api/src/repositories/catalog.repository.js';

const integrationTest = ['true', 'local'].includes(process.env.RUN_DATABASE_INTEGRATION ?? '')
    ? test
    : test.skip;

integrationTest(
    'Owner loss is serialized and shared catalog counts do not disclose other profiles',
    { timeout: 180_000 },
    async (context) => {
        const fixture = await startReviewDatabase();
        context.after(fixture.stop);
        const db = fixture.database;
        const createOrganization = () =>
            db.organization.create({
                data: {
                    id: randomUUID(),
                    slug: randomUUID(),
                    name: 'Review organization',
                    createdAt: new Date(),
                },
            });
        const createOwner = async (organizationId: string) => {
            const user = await db.user.create({
                data: { id: randomUUID(), name: 'Owner', email: `${randomUUID()}@example.test` },
            });
            return db.member.create({
                data: {
                    id: randomUUID(),
                    organizationId,
                    userId: user.id,
                    role: 'owner',
                    createdAt: new Date(),
                },
            });
        };

        for (const isolationLevel of ['ReadCommitted', 'RepeatableRead', 'Serializable'] as const) {
            for (const action of ['demote', 'remove'] as const) {
                await context.test(
                    `${isolationLevel}: concurrent ${action} retains one Owner`,
                    async () => {
                        const org = await createOrganization();
                        const members = await Promise.all([
                            createOwner(org.id),
                            createOwner(org.id),
                        ]);
                        let arrived = 0;
                        let release!: () => void;
                        const barrier = new Promise<void>((resolve) => {
                            release = resolve;
                        });
                        const results = await Promise.allSettled(
                            members.map((member) =>
                                db.$transaction(
                                    async (tx) => {
                                        // Both requests pass the old application check before either writes.
                                        assert.equal(
                                            await tx.member.count({
                                                where: { organizationId: org.id, role: 'owner' },
                                            }),
                                            2
                                        );
                                        if (++arrived === 2) release();
                                        await barrier;
                                        if (action === 'demote')
                                            await tx.member.update({
                                                where: { id: member.id },
                                                data: { role: 'member' },
                                            });
                                        else await tx.member.delete({ where: { id: member.id } });
                                    },
                                    { isolationLevel, timeout: 15_000 }
                                )
                            )
                        );
                        assert.equal(
                            results.filter((result) => result.status === 'fulfilled').length,
                            1
                        );
                        assert.equal(
                            await db.member.count({
                                where: { organizationId: org.id, role: 'owner' },
                            }),
                            1
                        );
                        const owner = await db.member.findFirstOrThrow({
                            where: { organizationId: org.id, role: 'owner' },
                        });
                        // User deletion cascades must not bypass owner protection either.
                        await assert.rejects(db.user.delete({ where: { id: owner.userId } }));
                        const target = await createOrganization();
                        await assert.rejects(
                            db.member.update({
                                where: { id: owner.id },
                                data: { organizationId: target.id },
                            })
                        );
                        await db.member.update({
                            where: { id: owner.id },
                            data: { role: 'owner,member' },
                        });
                        const successor = await createOwner(org.id);
                        await db.member.delete({ where: { id: owner.id } });
                        assert.equal(
                            (await db.member.findUniqueOrThrow({ where: { id: successor.id } }))
                                .role,
                            'owner'
                        );
                        await createOwner(org.id);
                        await assert.rejects(
                            db.member.deleteMany({ where: { organizationId: org.id } })
                        );
                        assert.equal(
                            await db.member.count({
                                where: { organizationId: org.id, role: 'owner' },
                            }),
                            2
                        );
                    }
                );
            }
        }

        await context.test(
            'category and template counts include only visible relationships',
            async () => {
                const organizations = await Promise.all([
                    createOrganization(),
                    createOrganization(),
                ]);
                const profiles = await Promise.all(
                    organizations.map((org) =>
                        db.vendorProfile.create({
                            data: {
                                organizationId: org.id,
                                displayName: 'Review vendor',
                            },
                        })
                    )
                );
                // The schema permits future profiles; counts must be isolated even within one org.
                profiles.push(
                    await db.vendorProfile.create({
                        data: {
                            organizationId: organizations[0]!.id,
                            profileKey: 'future-review',
                            displayName: 'Other profile',
                        },
                    })
                );
                const systemTemplate = await db.characteristicTemplate.create({
                    data: { name: 'Shared template', fields: [] },
                });
                const root = await db.category.create({
                    data: { name: 'Shared root', defaultTemplateId: systemTemplate.id },
                });
                const systemChild = await db.category.create({
                    data: {
                        name: 'Shared child',
                        parentId: root.id,
                        defaultTemplateId: systemTemplate.id,
                    },
                });
                for (const profile of profiles) {
                    await db.category.create({
                        data: {
                            name: 'Private child',
                            parentId: root.id,
                            vendorProfileId: profile.id,
                            defaultTemplateId: systemTemplate.id,
                        },
                    });
                    await db.characteristicTemplate.create({
                        data: { name: 'Private template', vendorProfileId: profile.id, fields: [] },
                    });
                    await db.product.createMany({
                        data: [null, new Date()].map((deletedAt) => ({
                            baseName: 'Private product',
                            sku: randomUUID(),
                            categoryId: systemChild.id,
                            vendorProfileId: profile.id,
                            deletedAt,
                        })),
                    });
                }
                for (const profile of profiles) {
                    const categories = await listAvailableCategories(profile.id, db);
                    assert.equal(categories.length, 3);
                    assert.equal(
                        categories.find((item) => item.id === root.id)?._count.children,
                        2
                    );
                    assert.equal(
                        categories.find((item) => item.id === systemChild.id)?._count.products,
                        1
                    );
                    const templates = await listAvailableTemplates(profile.id, db);
                    assert.equal(templates.length, 2);
                    assert.equal(
                        templates.find((item) => item.id === systemTemplate.id)?._count
                            .defaultForCategories,
                        3
                    );
                    assert.equal(
                        (await findAvailableTemplateWithCounts(systemTemplate.id, profile.id, db))
                            ?._count.defaultForCategories,
                        3
                    );
                }
            }
        );
    }
);
