import prisma from '@inventory-system/database';
import type { UniversalSearchEntityType } from '@inventory-system/contracts';

/**
 * Decides between a literal and a trigram search. Running the cheap existence probe first keeps
 * fuzzy matching off the common path, where it would otherwise rank near-misses above exact hits.
 */
export const hasLiteralMatch = async (
    vendorProfileId: string,
    selectedTypes: UniversalSearchEntityType[],
    containsPattern: string
): Promise<boolean> => {
    const [literalMatch] = await prisma.$queryRaw<Array<{ found: boolean }>>`
        SELECT (
            (${selectedTypes.includes('product')} AND EXISTS (
                SELECT 1 FROM products p
                WHERE p.vendor_profile_id = ${vendorProfileId}
                  AND p.deleted_at IS NULL
                  AND p.search_text ILIKE ${containsPattern} ESCAPE '\'
            ))
            OR (${selectedTypes.includes('version')} AND EXISTS (
                SELECT 1 FROM product_versions pv
                JOIN products p
                  ON p.id = pv.product_id
                 AND p.vendor_profile_id = ${vendorProfileId}
                 AND p.deleted_at IS NULL
                WHERE pv.vendor_profile_id = ${vendorProfileId}
                  AND pv.deleted_at IS NULL
                  AND pv.search_text ILIKE ${containsPattern} ESCAPE '\'
            ))
            OR (${selectedTypes.includes('category')} AND EXISTS (
                SELECT 1 FROM categories c
                WHERE (c.vendor_profile_id IS NULL OR c.vendor_profile_id = ${vendorProfileId})
                  AND c.search_text ILIKE ${containsPattern} ESCAPE '\'
            ))
            OR (${selectedTypes.includes('template')} AND EXISTS (
                SELECT 1 FROM characteristic_templates t
                WHERE (t.vendor_profile_id IS NULL OR t.vendor_profile_id = ${vendorProfileId})
                  AND t.search_text ILIKE ${containsPattern} ESCAPE '\'
            ))
        ) AS found
    `;
    return literalMatch?.found === true;
};
