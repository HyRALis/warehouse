'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Package, Trash2 } from 'lucide-react';
import { Badge, Button, Spinner } from '@inventory-system/ui';
import { ProductStatus } from '@inventory-system/shared-types';
import { api } from '@/lib/api';
import ProductVersionManager, { ManagedProductVersion } from '@/components/ProductVersionManager';
import ProductDetailsEditor from '@/components/ProductDetailsEditor';
import type { CategoryOption } from '@/components/SearchableCategorySelect';

interface Product {
    id: string;
    baseName: string;
    sku: string;
    barcode?: string | null;
    status: ProductStatus;
    categoryId: string;
    category?: { id: string; name: string };
    versionCount?: number;
    versions: ManagedProductVersion[];
}

const badgeVariant = (status: ProductStatus): 'success' | 'warning' | 'danger' | 'default' =>
    status === ProductStatus.ACTIVE
        ? 'success'
        : status === ProductStatus.DRAFT
          ? 'warning'
          : 'danger';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchProduct = useCallback(async () => {
        try {
            const response = await api.getProduct(productId);
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Product not found');
            }
            setProduct(response.data);
            setLoadError('');
        } catch (fetchError: any) {
            setLoadError(fetchError?.message || 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        setCategoriesError('');
        try {
            const response = await api.getCategories();
            if (!response.success) throw new Error(response.message || 'Failed to load categories');
            setCategories(response.data || []);
        } catch (fetchError: any) {
            setCategoriesError(fetchError?.message || 'Categories are temporarily unavailable.');
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (productId) void fetchProduct();
    }, [fetchProduct, productId]);

    useEffect(() => {
        void fetchCategories();
    }, [fetchCategories]);

    const deleteProduct = async () => {
        if (!product || !window.confirm('Remove this product from your active catalog?')) return;
        setIsDeleting(true);
        setActionError('');
        try {
            await api.deleteProduct(product.id);
            router.push('/dashboard/products');
        } catch (deleteError: any) {
            setActionError(deleteError?.message || 'Could not delete this product');
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner size={8} />
            </div>
        );
    }

    if (loadError || !product) {
        return (
            <div className="mx-auto max-w-3xl rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-rose-500" />
                <h2 className="mb-2 text-lg font-semibold text-rose-300">Product unavailable</h2>
                <p className="mb-6 text-rose-200">{loadError || 'Product not found'}</p>
                <Link href="/dashboard/products" className="text-indigo-300 hover:text-indigo-200">
                    Back to products
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-7">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <Link
                    href="/dashboard/products"
                    className="flex items-center gap-1 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> Products
                </Link>
                <span>/</span>
                <span className="text-slate-200">{product.baseName}</span>
            </div>

            {actionError && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"
                >
                    {actionError}
                </div>
            )}

            <header className="flex flex-col justify-between gap-5 rounded-xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-center">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
                        <Package className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{product.baseName}</h1>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant={badgeVariant(product.status)}>
                                Product: {product.status}
                            </Badge>
                            <Badge variant="outline">
                                {product.versionCount || product.versions.length} versions
                            </Badge>
                            {product.category && <Badge>{product.category.name}</Badge>}
                        </div>
                    </div>
                </div>
                <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => void deleteProduct()}
                >
                    {isDeleting ? (
                        <Spinner className="mr-2" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete product
                </Button>
            </header>

            <ProductDetailsEditor
                product={product}
                categories={categories}
                categoriesLoading={categoriesLoading}
                categoriesError={categoriesError}
                onRetryCategories={() => void fetchCategories()}
                onSaved={fetchProduct}
            />

            <ProductVersionManager
                productId={product.id}
                productStatus={product.status}
                versions={product.versions || []}
                onChanged={fetchProduct}
            />
        </div>
    );
}
