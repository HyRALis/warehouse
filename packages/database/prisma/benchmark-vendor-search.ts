import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import prisma, { type Prisma } from '../src/index.js';

const CORPUS_SIZE = 10_000;
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 15;
const DEFAULT_EXACT_P95_LIMIT_MS = 250;
const DEFAULT_FUZZY_P95_LIMIT_MS = 1_250;
const DEFAULT_BROAD_P95_LIMIT_MS = 1_500;
const BENCHMARK_MARKER = '__vendor_search_benchmark__:';

type SearchClient = Pick<Prisma.TransactionClient, '$queryRawUnsafe'>;

interface SearchBenchmarkResult {
    scenario: string;
    matches: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
    limitMs: number;
}

const percentile = (values: number[], fraction: number): number => {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
};

const round = (value: number): number => Number(value.toFixed(2));

const positiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const benchmarkQuery = async (
    database: SearchClient,
    vendorProfileId: string,
    normalizedQuery: string,
    scenario: string,
    limitMs: number
): Promise<SearchBenchmarkResult> => {
    const query = async (): Promise<number> => {
        const [literalMatch] = await database.$queryRawUnsafe<Array<{ found: boolean }>>(
            `
                SELECT (
                    EXISTS (
                        SELECT 1 FROM products p
                        WHERE p.vendor_profile_id = $1
                          AND p.deleted_at IS NULL
                          AND p.search_text ILIKE '%' || $2 || '%'
                    )
                    OR EXISTS (
                        SELECT 1 FROM product_versions pv
                        JOIN products p
                          ON p.id = pv.product_id
                         AND p.vendor_profile_id = $1
                         AND p.deleted_at IS NULL
                        WHERE pv.vendor_profile_id = $1
                          AND pv.deleted_at IS NULL
                          AND pv.search_text ILIKE '%' || $2 || '%'
                    )
                ) AS found
            `,
            vendorProfileId,
            normalizedQuery
        );
        const candidateOperator = literalMatch?.found ? "ILIKE '%' || $2 || '%'" : '% $2';
        const rows = await database.$queryRawUnsafe<Array<{ totalCount: number | bigint }>>(
            `
                WITH ranked_results AS (
                    SELECT
                        'product'::text AS type,
                        p.id,
                        CASE
                            WHEN lower(p.sku) = $2 THEN 1200
                            WHEN lower(p.base_name) = $2 THEN 1100
                            WHEN lower(p.sku) LIKE $2 || '%' THEN 1000
                            ELSE 500 + similarity(p.search_text, $2) * 300
                        END::double precision AS score
                    FROM products p
                    JOIN categories c
                      ON c.id = p.category_id
                     AND (c.vendor_profile_id IS NULL OR c.vendor_profile_id = $1)
                    WHERE p.vendor_profile_id = $1
                      AND p.deleted_at IS NULL
                      AND p.search_text ${candidateOperator}

                    UNION ALL

                    SELECT
                        'version'::text AS type,
                        pv.id,
                        CASE
                            WHEN lower(pv.sku) = $2 THEN 1280
                            WHEN lower(pv.label) = $2 THEN 1080
                            WHEN lower(pv.sku) LIKE $2 || '%' THEN 1020
                            ELSE 500 + similarity(pv.search_text, $2) * 300
                        END::double precision AS score
                    FROM product_versions pv
                    JOIN products p
                      ON p.id = pv.product_id
                     AND p.vendor_profile_id = $1
                     AND p.deleted_at IS NULL
                    JOIN categories c
                      ON c.id = p.category_id
                     AND (c.vendor_profile_id IS NULL OR c.vendor_profile_id = $1)
                    WHERE pv.vendor_profile_id = $1
                      AND pv.deleted_at IS NULL
                      AND pv.search_text ${candidateOperator}
                ), paged_results AS (
                    SELECT *, count(*) OVER () AS "totalCount"
                    FROM ranked_results
                    ORDER BY score DESC, id ASC
                    LIMIT 20
                )
                SELECT "totalCount" FROM paged_results
            `,
            vendorProfileId,
            normalizedQuery
        );

        return Number(rows[0]?.totalCount ?? 0);
    };

    for (let iteration = 0; iteration < WARMUP_RUNS; iteration += 1) await query();

    const samples: number[] = [];
    let matches = 0;
    for (let iteration = 0; iteration < MEASURED_RUNS; iteration += 1) {
        const startedAt = performance.now();
        matches = await query();
        samples.push(performance.now() - startedAt);
    }

    return {
        scenario,
        matches,
        p50Ms: round(percentile(samples, 0.5)),
        p95Ms: round(percentile(samples, 0.95)),
        maxMs: round(Math.max(...samples)),
        limitMs,
    };
};

async function main(): Promise<void> {
    const profile = await prisma.vendorProfile.findFirst({
        where: { deletedAt: null, legacyVendorId: { not: null } },
        select: { id: true, legacyVendorId: true },
        orderBy: { createdAt: 'asc' },
    });

    if (!profile?.legacyVendorId) {
        throw new Error(
            'Search benchmark needs an existing migrated or registered Vendor Profile. Seed and register a vendor first.'
        );
    }

    const category = await prisma.category.findFirst({
        where: { OR: [{ vendorProfileId: null }, { vendorProfileId: profile.id }] },
        select: { id: true },
        orderBy: [{ vendorProfileId: 'asc' }, { createdAt: 'asc' }],
    });

    if (!category)
        throw new Error(
            'Search benchmark needs at least one accessible category. Run the system catalog seed first.'
        );

    const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
    const runMarker = `${BENCHMARK_MARKER}${runToken}`;
    const skuPrefix = `BENCH-${runToken}`;
    const exactP95LimitMs = positiveNumber(
        process.env.SEARCH_BENCHMARK_EXACT_P95_MS,
        DEFAULT_EXACT_P95_LIMIT_MS
    );
    const fuzzyP95LimitMs = positiveNumber(
        process.env.SEARCH_BENCHMARK_FUZZY_P95_MS,
        DEFAULT_FUZZY_P95_LIMIT_MS
    );
    const broadP95LimitMs = positiveNumber(
        process.env.SEARCH_BENCHMARK_BROAD_P95_MS,
        DEFAULT_BROAD_P95_LIMIT_MS
    );
    let corpusLoaded = false;

    const cleanupCorpus = async (): Promise<void> => {
        await prisma.product.deleteMany({
            where: {
                vendorProfileId: profile.id,
                searchText: { startsWith: runMarker },
            },
        });
    };

    try {
        await prisma.$transaction(
            async (transaction) => {
                const setupStartedAt = performance.now();
                // The compatibility triggers perform a profile lookup per row. The benchmark
                // supplies both validated ownership keys, so bypass them while loading only.
                await transaction.$executeRawUnsafe(
                    'ALTER TABLE products DISABLE TRIGGER products_sync_vendor_profile_ownership'
                );
                await transaction.$executeRawUnsafe(
                    'ALTER TABLE product_versions DISABLE TRIGGER product_versions_sync_vendor_profile_ownership'
                );
                await transaction.$executeRawUnsafe(
                    `
                        INSERT INTO products (
                            id, vendor_id, vendor_profile_id, category_id, sku, base_name,
                            status, characteristics, search_text, created_at, updated_at
                        )
                        SELECT
                            md5($1 || ':product:' || series::text),
                            $2,
                            $3,
                            $4,
                            $5 || '-P-' || lpad(series::text, 5, '0'),
                            'Benchmark Inventory Item ' || lpad(series::text, 5, '0'),
                            'ACTIVE'::"ProductStatus",
                            '[]'::jsonb,
                            $7 || ' benchmark inventory item ' || lpad(series::text, 5, '0') || ' ' || lower($5) || '-p-' || lpad(series::text, 5, '0'),
                            now(),
                            now()
                        FROM generate_series(1, $6::integer) AS series
                    `,
                    runToken,
                    profile.legacyVendorId,
                    profile.id,
                    category.id,
                    skuPrefix,
                    CORPUS_SIZE,
                    runMarker
                );

                await transaction.$executeRawUnsafe(
                    `
                        INSERT INTO product_versions (
                            id, product_id, vendor_id, vendor_profile_id, version_number,
                            label, sku, status, characteristics, is_primary, search_text,
                            created_at, updated_at
                        )
                        SELECT
                            md5($1 || ':version:' || series::text),
                            md5($1 || ':product:' || series::text),
                            $2,
                            $3,
                            1,
                            'Original',
                            $4 || '-V-' || lpad(series::text, 5, '0'),
                            'ACTIVE'::"ProductStatus",
                            '[]'::jsonb,
                            true,
                            $6 || ' benchmark inventory item ' || lpad(series::text, 5, '0') || ' original ' || lower($4) || '-v-' || lpad(series::text, 5, '0'),
                            now(),
                            now()
                        FROM generate_series(1, $5::integer) AS series
                    `,
                    runToken,
                    profile.legacyVendorId,
                    profile.id,
                    skuPrefix,
                    CORPUS_SIZE,
                    runMarker
                );

                await transaction.$executeRawUnsafe(
                    'ALTER TABLE products ENABLE TRIGGER products_sync_vendor_profile_ownership'
                );
                await transaction.$executeRawUnsafe(
                    'ALTER TABLE product_versions ENABLE TRIGGER product_versions_sync_vendor_profile_ownership'
                );
                console.log(
                    `Temporary benchmark corpus loaded in ${round(performance.now() - setupStartedAt)} ms.`
                );
            },
            { maxWait: 10_000, timeout: 300_000 }
        );
        corpusLoaded = true;
        await prisma.$executeRawUnsafe('ANALYZE products, product_versions');

        const results = [
            await benchmarkQuery(
                prisma,
                profile.id,
                `${skuPrefix}-V-10000`.toLowerCase(),
                'exact version SKU',
                exactP95LimitMs
            ),
            await benchmarkQuery(
                prisma,
                profile.id,
                'benchmrk inventry 10000',
                'fuzzy typo recovery',
                fuzzyP95LimitMs
            ),
            await benchmarkQuery(
                prisma,
                profile.id,
                'benchmark inventory',
                'broad product/version text',
                broadP95LimitMs
            ),
        ];

        console.table(results);
        console.log(
            `Corpus: ${CORPUS_SIZE.toLocaleString()} products + ${CORPUS_SIZE.toLocaleString()} versions.`
        );
        console.log('Each scenario must remain within its displayed p95 limit.');

        const failures = results.filter((result) => result.p95Ms > result.limitMs);
        if (failures.length > 0) {
            throw new Error(
                `Search benchmark exceeded its p95 limit: ${failures.map((result) => `${result.scenario} ${result.p95Ms} ms`).join(', ')}`
            );
        }
    } finally {
        if (corpusLoaded) {
            await cleanupCorpus();
            await prisma.$executeRawUnsafe('ANALYZE products, product_versions');
            console.log('Temporary benchmark corpus removed.');
        }
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
