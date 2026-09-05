'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/features/categories';
import { ProductDetailsEditor } from '@/components/ProductDetailsEditor';
import ProductVersionManager from '@/components/ProductVersionManager';
import { AlertTriangle, ArrowLeft, ImagePlus, Trash2 } from 'lucide-react';
import { Alert, AlertDialog, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useDeleteProduct, useProduct } from '../hooks';
import { ProductStatusBadge } from './ProductStatusBadge';

export const ProductDetailView = ({ productId }: { productId: string }) => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const router = useRouter();
    const product = useProduct(productId);
    const deleteProduct = useDeleteProduct();
    const categories = useCategories();
    const queryClient = useQueryClient();
    const refreshCatalog = async (): Promise<void> => { await queryClient.invalidateQueries(); };

    if (product.isPending) return <div className="space-y-6"><Skeleton className="h-20" /><Skeleton className="h-96" /></div>;
    if (product.error || !product.data) return <div className="mx-auto max-w-3xl rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-rose-500" /><h1 className="mb-2 text-lg font-semibold text-rose-400">Product unavailable</h1>
        <p className="mb-6 text-rose-300">{product.error ? getErrorMessage(product.error) : 'Product not found'}</p>
        <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"><ArrowLeft className="h-4 w-4" /> Back to Products</Link>
    </div>;

    const item = product.data;
    const primaryImages = item.primaryVersion?.images ?? item.images;
    const primaryImage = primaryImages[0];
    return <div className="mx-auto max-w-5xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-4 text-sm text-slate-400"><Link href="/dashboard/products" className="flex items-center gap-1 hover:text-white"><ArrowLeft className="h-4 w-4" /> Products</Link><span aria-hidden>/</span><span className="text-slate-200">{item.baseName}</span></nav>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div><h1 className="mb-2 text-3xl font-bold text-white">{item.baseName}</h1><div className="flex flex-wrap items-center gap-3"><Badge variant="outline" className="font-mono">SKU: {item.sku}</Badge><ProductStatusBadge status={item.status} />{item.category && <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-400">{item.category.name}</Badge>}</div></div>
            <div className="flex gap-3"><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></div>
        </div>
        <ProductDetailsEditor key={item.id} product={item} categories={categories.data ?? []} categoriesLoading={categories.isPending} categoriesError={categories.error ? getErrorMessage(categories.error) : undefined} onRetryCategories={() => { void categories.refetch(); }} onSaved={refreshCatalog} />
        <ProductVersionManager key={`versions-${item.id}`} productId={item.id} productStatus={item.status} versions={item.versions ?? []} onChanged={refreshCatalog} />
        <div className="grid gap-6 pt-4 lg:grid-cols-3">
            <div className="space-y-4">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    {primaryImage ? <Image src={primaryImage.imageUrl} alt={item.baseName} fill sizes="(max-width: 1024px) 100vw, 33vw" unoptimized className="object-cover" /> : <div className="flex flex-col items-center text-slate-500"><ImagePlus className="mb-2 h-12 w-12 opacity-30" /><span>No images</span></div>}
                </div>
                {primaryImages.length > 1 && <div className="grid grid-cols-4 gap-2">{primaryImages.slice(1).map((image) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-700"><Image src={image.imageUrl} alt={`${item.baseName} alternate view`} fill sizes="96px" unoptimized className="object-cover" /></div>)}</div>}
            </div>
            <div className="space-y-6 lg:col-span-2">
                <Card><CardHeader><CardTitle>Product Details</CardTitle></CardHeader><CardContent><dl className="grid gap-6 sm:grid-cols-2">
                    <div><dt className="text-sm text-slate-500">SKU</dt><dd className="mt-1 font-mono text-slate-200">{item.sku}</dd></div>
                    <div><dt className="text-sm text-slate-500">Barcode</dt><dd className="mt-1 font-mono text-slate-200">{item.barcode || 'Not specified'}</dd></div>
                    <div><dt className="text-sm text-slate-500">Category</dt><dd className="mt-1 text-slate-200">{item.category?.name || 'Uncategorized'}</dd></div>
                    <div><dt className="text-sm text-slate-500">Status</dt><dd className="mt-1"><ProductStatusBadge status={item.status} /></dd></div>
                </dl></CardContent></Card>
                <Card><CardHeader><CardTitle>Characteristics</CardTitle></CardHeader><CardContent>
                    {item.characteristics.length === 0 ? <p className="text-sm text-slate-500">No characteristics defined.</p> : <dl className="divide-y divide-slate-800">{item.characteristics.map((characteristic) => <div key={`${characteristic.name}-${characteristic.value}`} className="flex justify-between gap-6 py-3 first:pt-0 last:pb-0"><dt className="text-slate-400">{characteristic.name}</dt><dd className="text-right font-medium text-slate-200">{characteristic.value}{characteristic.measurement ? ` ${characteristic.measurement}` : ''}</dd></div>)}</dl>}
                </CardContent></Card>
            </div>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete product?" description={`Remove ${item.baseName} from your catalog? This cannot be undone.`} confirmLabel="Delete product" pending={deleteProduct.isPending}
            onConfirm={() => deleteProduct.mutate(item.id, { onSuccess: () => router.push('/dashboard/products') })}>
            {deleteProduct.error && <Alert variant="danger">{getErrorMessage(deleteProduct.error)}</Alert>}
        </AlertDialog>
    </div>;
};
