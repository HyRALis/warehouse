import { Response, NextFunction } from 'express';
import prisma from '@inventory-system/database';
import type {
    UniversalSearchEntityType,
    UniversalSearchGroup,
    UniversalSearchMode,
    UniversalSearchResponse,
    UniversalSearchResult,
} from '@inventory-system/shared-types';
import { AuthRequest } from '../middleware/auth';

interface SearchRow {
    type: UniversalSearchEntityType | null;
    id: string | null;
    title: string | null;
    subtitle: string | null;
    href: string | null;
    score: number | string | null;
    matchedField: string | null;
    context: UniversalSearchResult['context'] | null;
    totalCount: bigint | number | string;
}

const allTypes: UniversalSearchEntityType[] = ['product', 'version', 'category', 'template'];
const groupLabels: Record<UniversalSearchEntityType, string> = {
    product: 'Products',
    version: 'Product versions',
    category: 'Categories',
    template: 'Templates',
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const parseTypes = (value: unknown): UniversalSearchEntityType[] => {
    if (typeof value !== 'string' || value.length === 0) return allTypes;
    return value.split(',') as UniversalSearchEntityType[];
};

const serializeRow = (row: SearchRow): UniversalSearchResult => ({
    type: row.type as UniversalSearchEntityType,
    id: row.id as string,
    title: row.title as string,
    subtitle: row.subtitle,
    href: row.href as string,
    score: Number(row.score),
    matchedField: row.matchedField as string,
    context: row.context as UniversalSearchResult['context'],
});

export class SearchController {
    static async universal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const startedAt = performance.now();
            const vendorId = req.vendorId as string;
            const query = String(req.query.q).trim();
            const normalizedQuery = query.toLocaleLowerCase();
            const escapedQuery = escapeLike(normalizedQuery);
            const containsPattern = `%${escapedQuery}%`;
            const prefixPattern = `${escapedQuery}%`;
            const mode = String(req.query.mode ?? 'suggestions') as UniversalSearchMode;
            const selectedTypes = parseTypes(req.query.types);
            const page = Number(req.query.page ?? 1);
            const requestedLimit = Number(req.query.limit ?? 20);
            const limit = mode === 'suggestions' ? Math.min(requestedLimit, 20) : requestedLimit;
            const offset = mode === 'suggestions' ? 0 : (page - 1) * limit;

            const rows = await prisma.$queryRaw<SearchRow[]>`
                WITH ranked_results AS (
                    SELECT
                        'product'::text AS type,
                        p.id,
                        p.base_name AS title,
                        concat_ws(' · ', p.sku, c.name) AS subtitle,
                        '/dashboard/products/' || p.id AS href,
                        CASE
                            WHEN lower(p.sku) = ${normalizedQuery} THEN 1200
                            WHEN lower(coalesce(p.barcode, '')) = ${normalizedQuery} THEN 1180
                            WHEN lower(p.base_name) = ${normalizedQuery} THEN 1100
                            WHEN lower(p.sku) LIKE ${prefixPattern} ESCAPE '\\' THEN 1000
                            WHEN lower(p.base_name) LIKE ${prefixPattern} ESCAPE '\\' THEN 950
                            ELSE 500 + similarity(p.search_text, ${normalizedQuery}) * 300
                        END::double precision AS score,
                        CASE
                            WHEN lower(p.sku) = ${normalizedQuery} OR lower(p.sku) LIKE ${prefixPattern} ESCAPE '\\' THEN 'sku'
                            WHEN lower(coalesce(p.barcode, '')) = ${normalizedQuery} THEN 'barcode'
                            ELSE 'name'
                        END AS "matchedField",
                        jsonb_build_object(
                            'sku', p.sku,
                            'barcode', p.barcode,
                            'status', p.status,
                            'breadcrumb', concat_ws(' / ', pc.name, c.name)
                        ) AS context
                    FROM products p
                    JOIN categories c ON c.id = p.category_id
                    LEFT JOIN categories pc ON pc.id = c.parent_id
                    WHERE ${selectedTypes.includes('product')}
                      AND p.vendor_id = ${vendorId}
                      AND p.deleted_at IS NULL
                      AND (
                          lower(p.sku) = ${normalizedQuery}
                          OR lower(coalesce(p.barcode, '')) = ${normalizedQuery}
                          OR p.search_text ILIKE ${containsPattern} ESCAPE '\\'
                          OR similarity(p.search_text, ${normalizedQuery}) >= 0.15
                      )

                    UNION ALL

                    SELECT
                        'version'::text AS type,
                        pv.id,
                        pv.label AS title,
                        concat_ws(' · ', p.base_name, pv.sku) AS subtitle,
                        '/dashboard/products/' || p.id || '?version=' || pv.id AS href,
                        CASE
                            WHEN lower(coalesce(pv.barcode, '')) = ${normalizedQuery} THEN 1300
                            WHEN lower(pv.sku) = ${normalizedQuery} THEN 1280
                            WHEN lower(pv.label) = ${normalizedQuery} THEN 1080
                            WHEN lower(pv.sku) LIKE ${prefixPattern} ESCAPE '\\' THEN 1020
                            WHEN lower(pv.label) LIKE ${prefixPattern} ESCAPE '\\' THEN 930
                            ELSE 500 + similarity(pv.search_text, ${normalizedQuery}) * 300
                        END::double precision AS score,
                        CASE
                            WHEN lower(coalesce(pv.barcode, '')) = ${normalizedQuery} THEN 'barcode'
                            WHEN lower(pv.sku) = ${normalizedQuery} OR lower(pv.sku) LIKE ${prefixPattern} ESCAPE '\\' THEN 'sku'
                            WHEN lower(pv.label) = ${normalizedQuery} OR lower(pv.label) LIKE ${prefixPattern} ESCAPE '\\' THEN 'version label'
                            ELSE 'product or version'
                        END AS "matchedField",
                        jsonb_build_object(
                            'productId', p.id,
                            'productName', p.base_name,
                            'sku', pv.sku,
                            'barcode', pv.barcode,
                            'status', pv.status,
                            'breadcrumb', concat_ws(' / ', pc.name, c.name)
                        ) AS context
                    FROM product_versions pv
                    JOIN products p ON p.id = pv.product_id
                    JOIN categories c ON c.id = p.category_id
                    LEFT JOIN categories pc ON pc.id = c.parent_id
                    WHERE ${selectedTypes.includes('version')}
                      AND pv.vendor_id = ${vendorId}
                      AND pv.deleted_at IS NULL
                      AND p.deleted_at IS NULL
                      AND (
                          lower(pv.sku) = ${normalizedQuery}
                          OR lower(coalesce(pv.barcode, '')) = ${normalizedQuery}
                          OR pv.search_text ILIKE ${containsPattern} ESCAPE '\\'
                          OR p.search_text ILIKE ${containsPattern} ESCAPE '\\'
                          OR similarity(pv.search_text, ${normalizedQuery}) >= 0.15
                      )

                    UNION ALL

                    SELECT
                        'category'::text AS type,
                        c.id,
                        c.name AS title,
                        concat_ws(' / ', pc.name, c.name) AS subtitle,
                        '/dashboard/categories?category=' || c.id AS href,
                        CASE
                            WHEN lower(coalesce(c.code, '')) = ${normalizedQuery} THEN 1250
                            WHEN lower(c.name) = ${normalizedQuery} THEN 1120
                            WHEN EXISTS (SELECT 1 FROM unnest(c.aliases) alias WHERE lower(alias) = ${normalizedQuery}) THEN 1100
                            WHEN lower(c.name) LIKE ${prefixPattern} ESCAPE '\\' THEN 940
                            ELSE 500 + similarity(c.search_text, ${normalizedQuery}) * 300
                        END::double precision AS score,
                        CASE
                            WHEN lower(coalesce(c.code, '')) = ${normalizedQuery} THEN 'code'
                            WHEN EXISTS (SELECT 1 FROM unnest(c.aliases) alias WHERE lower(alias) = ${normalizedQuery}) THEN 'alias'
                            ELSE 'name'
                        END AS "matchedField",
                        jsonb_build_object(
                            'categoryCode', c.code,
                            'breadcrumb', concat_ws(' / ', pc.name, c.name),
                            'ownership', CASE WHEN c.vendor_id IS NULL THEN 'system' ELSE 'vendor' END
                        ) AS context
                    FROM categories c
                    LEFT JOIN categories pc ON pc.id = c.parent_id
                    WHERE ${selectedTypes.includes('category')}
                      AND (c.vendor_id IS NULL OR c.vendor_id = ${vendorId})
                      AND (
                          lower(coalesce(c.code, '')) = ${normalizedQuery}
                          OR c.search_text ILIKE ${containsPattern} ESCAPE '\\'
                          OR EXISTS (SELECT 1 FROM unnest(c.aliases) alias WHERE lower(alias) LIKE ${containsPattern} ESCAPE '\\')
                          OR similarity(c.search_text, ${normalizedQuery}) >= 0.15
                      )

                    UNION ALL

                    SELECT
                        'template'::text AS type,
                        t.id,
                        t.name AS title,
                        CASE WHEN t.vendor_id IS NULL THEN 'System template' ELSE 'Custom template' END AS subtitle,
                        '/dashboard/templates?template=' || t.id AS href,
                        CASE
                            WHEN lower(coalesce(t.key, '')) = ${normalizedQuery} THEN 1250
                            WHEN lower(t.name) = ${normalizedQuery} THEN 1120
                            WHEN lower(t.name) LIKE ${prefixPattern} ESCAPE '\\' THEN 940
                            ELSE 500 + GREATEST(
                                similarity(t.search_text, ${normalizedQuery}),
                                similarity(t.fields::text, ${normalizedQuery})
                            ) * 300
                        END::double precision AS score,
                        CASE
                            WHEN lower(coalesce(t.key, '')) = ${normalizedQuery} THEN 'key'
                            WHEN lower(t.name) = ${normalizedQuery} OR lower(t.name) LIKE ${prefixPattern} ESCAPE '\\' THEN 'name'
                            ELSE 'field name'
                        END AS "matchedField",
                        jsonb_build_object(
                            'ownership', CASE WHEN t.vendor_id IS NULL THEN 'system' ELSE 'vendor' END
                        ) AS context
                    FROM characteristic_templates t
                    WHERE ${selectedTypes.includes('template')}
                      AND (t.vendor_id IS NULL OR t.vendor_id = ${vendorId})
                      AND (
                          lower(coalesce(t.key, '')) = ${normalizedQuery}
                          OR t.search_text ILIKE ${containsPattern} ESCAPE '\\'
                          OR t.fields::text ILIKE ${containsPattern} ESCAPE '\\'
                          OR similarity(t.search_text, ${normalizedQuery}) >= 0.15
                      )
                ), numbered_results AS (
                    SELECT
                        *,
                        row_number() OVER (PARTITION BY type ORDER BY score DESC, title ASC, id ASC) AS "typeRank"
                    FROM ranked_results
                ), paged_results AS (
                    SELECT *
                    FROM numbered_results
                    WHERE ${mode === 'results'} OR "typeRank" <= 5
                    ORDER BY score DESC, title ASC, id ASC
                    LIMIT ${limit}
                    OFFSET ${offset}
                )
                SELECT page.*, totals."totalCount"
                FROM (SELECT count(*) AS "totalCount" FROM ranked_results) totals
                LEFT JOIN paged_results page ON true
                ORDER BY page.score DESC, page.title ASC, page.id ASC
            `;

            const data = rows.filter((row) => row.id !== null).map(serializeRow);
            const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
            const groups: UniversalSearchGroup[] = allTypes
                .map((type) => ({
                    type,
                    label: groupLabels[type],
                    results: data.filter((result) => result.type === type).slice(0, 5),
                }))
                .filter((group) => group.results.length > 0);

            const response: UniversalSearchResponse = {
                query,
                mode,
                groups,
                data,
                total,
                page: mode === 'suggestions' ? 1 : page,
                limit,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
                tookMs: Number((performance.now() - startedAt).toFixed(2)),
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
}
