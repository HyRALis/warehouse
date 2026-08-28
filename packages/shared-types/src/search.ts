export type UniversalSearchEntityType = 'product' | 'version' | 'category' | 'template';

export type UniversalSearchMode = 'suggestions' | 'results';

export interface UniversalSearchResult {
    type: UniversalSearchEntityType;
    id: string;
    title: string;
    subtitle: string | null;
    href: string;
    score: number;
    matchedField: string;
    context: {
        productId?: string;
        productName?: string;
        sku?: string;
        barcode?: string;
        status?: string;
        categoryCode?: string;
        breadcrumb?: string;
        ownership?: 'system' | 'vendor';
    };
}

export interface UniversalSearchGroup {
    type: UniversalSearchEntityType;
    label: string;
    results: UniversalSearchResult[];
}

export interface UniversalSearchResponse {
    query: string;
    mode: UniversalSearchMode;
    groups: UniversalSearchGroup[];
    data: UniversalSearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    tookMs: number;
}
