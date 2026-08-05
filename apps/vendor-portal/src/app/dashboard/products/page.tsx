'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Filter, Loader2, PackageX, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    baseName: string;
    sku: string;
    status: string;
    categoryId: string;
    images: { url: string; isPrimary: boolean }[];
    category?: { name: string };
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 12 };
            if (search) params.search = search;
            if (status) params.status = status;

            const res = await api.getProducts(params);
            if (res.success) {
                setProducts(res.data || []);
                if (res.meta) {
                    setTotalPages(res.meta.totalPages);
                    setTotalItems(res.meta.total);
                }
            } else {
                setError(res.message || 'Failed to fetch products');
            }
        } catch (err: any) {
            setError(err.message || 'Error loading products');
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, status, page]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatus(e.target.value);
        setPage(1);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'draft':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'discontinued':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default:
                return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold text-white">Products</h1>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search by name, SKU..."
                        className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-slate-100 placeholder-slate-500 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-slate-500" />
                    <select
                        value={status}
                        onChange={handleStatusChange}
                        className="rounded-lg border border-slate-800 bg-slate-950 py-2 pl-3 pr-8 text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Discontinued">Discontinued</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 py-20 text-center">
                    <PackageX className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                    <h3 className="mb-1 text-lg font-medium text-slate-200">No products found</h3>
                    <p className="mb-6 text-slate-400">
                        Try adjusting your search or filters, or add a new product.
                    </p>
                    <Link
                        href="/dashboard/products/new"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-500"
                    >
                        <Plus className="h-4 w-4" /> Add Product
                    </Link>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => {
                            const primaryImage =
                                product.images?.find((img) => img.isPrimary) || product.images?.[0];
                            return (
                                <Link
                                    key={product.id}
                                    href={`/dashboard/products/${product.id}`}
                                    className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
                                >
                                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-950">
                                        {primaryImage ? (
                                            <img
                                                src={primaryImage.url}
                                                alt={product.baseName}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-600">
                                                <PackageX className="mb-2 h-8 w-8 opacity-50" />
                                                <span className="text-xs font-medium uppercase">
                                                    No Image
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute right-3 top-3">
                                            <span
                                                className={`rounded-md border px-2 py-1 text-xs font-medium backdrop-blur-md ${getStatusColor(product.status)}`}
                                            >
                                                {product.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3
                                            className="truncate font-semibold text-slate-100 transition-colors group-hover:text-indigo-400"
                                            title={product.baseName}
                                        >
                                            {product.baseName}
                                        </h3>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="font-mono text-sm text-slate-500">
                                                {product.sku}
                                            </span>
                                            <span className="max-w-[120px] truncate rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                                                {product.category?.name || 'Uncategorized'}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                            <div className="text-sm text-slate-400">
                                Showing{' '}
                                <span className="font-medium text-white">
                                    {Math.min((page - 1) * 12 + 1, totalItems)}
                                </span>{' '}
                                to{' '}
                                <span className="font-medium text-white">
                                    {Math.min(page * 12, totalItems)}
                                </span>{' '}
                                of <span className="font-medium text-white">{totalItems}</span>{' '}
                                results
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="px-4 text-sm font-medium text-slate-300">
                                    Page {page} of {totalPages}
                                </div>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Floating Action Button for mobile */}
            <Link
                href="/dashboard/products/new"
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500 lg:hidden"
            >
                <Plus className="h-6 w-6" />
            </Link>
        </div>
    );
}
