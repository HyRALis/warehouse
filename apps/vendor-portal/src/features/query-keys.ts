export const tenantKeys = {
    root: (tenantId: string) => ['tenant', tenantId] as const,
    products: (tenantId: string) => [...tenantKeys.root(tenantId), 'products'] as const,
    productLists: (tenantId: string) => [...tenantKeys.products(tenantId), 'list'] as const,
    productList: (tenantId: string, filters: object) =>
        [...tenantKeys.productLists(tenantId), filters] as const,
    productDetails: (tenantId: string) => [...tenantKeys.products(tenantId), 'detail'] as const,
    productDetail: (tenantId: string, id: string) =>
        [...tenantKeys.productDetails(tenantId), id] as const,
    productVersions: (tenantId: string, productId: string) =>
        [...tenantKeys.productDetail(tenantId, productId), 'versions'] as const,
    productVersionComparison: (
        tenantId: string,
        productId: string,
        leftId: string,
        rightId: string
    ) => [...tenantKeys.productVersions(tenantId, productId), 'compare', leftId, rightId] as const,
    categories: (tenantId: string) => [...tenantKeys.root(tenantId), 'categories'] as const,
    categoryOptions: (tenantId: string) => [...tenantKeys.categories(tenantId), 'options'] as const,
    templates: (tenantId: string) => [...tenantKeys.root(tenantId), 'templates'] as const,
    dashboard: (tenantId: string) => [...tenantKeys.root(tenantId), 'dashboard'] as const,
    search: (tenantId: string) => [...tenantKeys.root(tenantId), 'search'] as const,
    searchQuery: (tenantId: string, query: object) =>
        [...tenantKeys.search(tenantId), query] as const,
};
