'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PackageX, Plus } from 'lucide-react';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useDebounceCallback } from 'usehooks-ts';
import { PRODUCT_STATUSES } from '@inventory-system/contracts';
import { Alert, EmptyState, PageHeader, Pagination, Skeleton, buttonVariants } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useProducts } from '../hooks';
import { ProductCard } from './ProductCard';
import { ProductFilters } from './ProductFilters';

export const productFilterParsers = { search: parseAsString.withDefault(''), status: parseAsStringLiteral(PRODUCT_STATUSES), page: parseAsInteger.withDefault(1) };

export const ProductsView = () => {
    const [filters, setFilters] = useQueryStates(productFilterParsers, { clearOnDefault: true, shallow: false });
    const [searchInput, setSearchInput] = useState(filters.search);
    const setSearch = useDebounceCallback((value: string) => void setFilters({ search: value, page: 1 }), 300);
    const products = useProducts({ page: filters.page, limit: 12, search: filters.search || undefined, status: filters.status || undefined });
    return <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Products" description="Manage your catalog" actions={<Link href="/dashboard/products/new" className="hidden rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 sm:inline-flex"><Plus className="mr-2 h-4 w-4" /> Add Product</Link>} />
        <ProductFilters search={searchInput} status={filters.status} onSearchChange={(value) => { setSearchInput(value); setSearch(value); }} onStatusChange={(status) => void setFilters({ status, page: 1 })} />
        {products.error && <Alert variant="danger">{getErrorMessage(products.error)}</Alert>}
        {products.isPending ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[4/5]" />)}</div>
            : (products.data?.data.length ?? 0) === 0 ? <EmptyState icon={<PackageX className="h-12 w-12" />} title="No products found" description="Adjust your filters or add a new product." action={<Link href="/dashboard/products/new" className={buttonVariants()}><Plus className="mr-2 h-4 w-4" /> Add Product</Link>} />
                : <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.data?.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
                    {products.data && <Pagination page={filters.page} totalPages={products.data.meta.totalPages} totalItems={products.data.meta.total} pageSize={12} onPageChange={(page) => void setFilters({ page })} />}</>}
        <Link href="/dashboard/products/new" aria-label="Add product" className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 sm:hidden"><Plus className="h-6 w-6" /></Link>
    </div>;
};
