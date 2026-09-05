import type {
    UniversalSearchEntityType,
    UniversalSearchResult,
} from '@inventory-system/contracts';

export interface SearchRow {
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

export const allTypes: UniversalSearchEntityType[] = [
    'product',
    'version',
    'category',
    'template',
];

export const groupLabels: Record<UniversalSearchEntityType, string> = {
    product: 'Products',
    version: 'Product versions',
    category: 'Categories',
    template: 'Templates',
};

/** The term is interpolated into a LIKE pattern, so its wildcards must be neutralized. */
export const escapeLike = (value: string): string => value.replace(/[\%_]/g, '\$&');

export const parseTypes = (value: unknown): UniversalSearchEntityType[] => {
    if (typeof value !== 'string' || value.length === 0) return allTypes;
    return [...new Set(value.split(',').map((type) => type.trim()))] as UniversalSearchEntityType[];
};

export const serializeRow = (row: SearchRow): UniversalSearchResult => ({
    type: row.type as UniversalSearchEntityType,
    id: row.id as string,
    title: row.title as string,
    subtitle: row.subtitle,
    href: row.href as string,
    score: Number(row.score),
    matchedField: row.matchedField as string,
    context: row.context as UniversalSearchResult['context'],
});
