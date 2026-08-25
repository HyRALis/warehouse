'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Trash2, Edit, ImagePlus, AlertTriangle } from 'lucide-react';
import {
    Button,
    Spinner,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Label,
} from '@inventory-system/ui';

interface ProductImage {
    id: string;
    imageUrl: string;
    sortOrder: number;
}

interface Characteristic {
    id: string;
    name: string;
    value: string;
    measurement?: string;
}

interface Product {
    id: string;
    baseName: string;
    sku: string;
    barcode?: string;
    qrCodeUrl?: string;
    status: string;
    categoryId: string;
    category?: { name: string };
    images: ProductImage[];
    characteristics: Characteristic[];
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await api.getProduct(params.id as string);
                if (res.success && res.data) {
                    setProduct(res.data);
                } else {
                    setError(res.message || 'Product not found');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load product details');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchProduct();
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Remove this product from your active catalog?'))
            return;

        setIsDeleting(true);
        try {
            const res = await api.deleteProduct(product!.id);
            if (res.success) {
                router.push('/dashboard/products');
            } else {
                alert(res.message || 'Failed to delete product');
                setIsDeleting(false);
            }
        } catch (err: any) {
            alert(err.message || 'Error deleting product');
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

    if (error || !product) {
        return (
            <div className="mx-auto max-w-3xl rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-rose-500" />
                <h2 className="mb-2 text-lg font-semibold text-rose-400">Error</h2>
                <p className="mb-6 text-rose-300">{error || 'Product not found'}</p>
                <Link
                    href="/dashboard/products"
                    className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Products
                </Link>
            </div>
        );
    }

    const primaryImage = product.images[0];
    const secondaryImages = product.images.slice(1);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="mb-2 flex items-center gap-4 text-sm text-slate-400">
                <Link
                    href="/dashboard/products"
                    className="flex items-center gap-1 transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> Products
                </Link>
                <span>/</span>
                <span className="text-slate-200">{product.baseName}</span>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="mb-2 text-3xl font-bold text-white">{product.baseName}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                            SKU: {product.sku}
                        </Badge>
                        <Badge
                            variant={
                                product.status === 'ACTIVE'
                                    ? 'success'
                                    : product.status === 'DRAFT'
                                      ? 'warning'
                                      : 'danger'
                            }
                        >
                            {product.status}
                        </Badge>
                        {product.category && (
                            <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-400">
                                {product.category.name}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex w-full items-center gap-3 md:w-auto">
                    <Button disabled variant="secondary" title="Edit functionality coming soon">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
                        {isDeleting ? (
                            <Spinner className="mr-2" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-3">
                {/* Images Column */}
                <div className="space-y-4 lg:col-span-1">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                        {primaryImage ? (
                            <img
                                src={primaryImage.imageUrl}
                                alt="Primary"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500">
                                <ImagePlus className="mb-2 h-12 w-12 opacity-30" />
                                <span>No images</span>
                            </div>
                        )}
                    </div>

                    {secondaryImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {secondaryImages.map((img) => (
                                <div
                                    key={img.id}
                                    className="aspect-square overflow-hidden rounded-lg border border-slate-700 bg-slate-800"
                                >
                                    <img
                                        src={img.imageUrl}
                                        alt="Secondary"
                                        className="h-full w-full cursor-pointer object-cover opacity-80 transition-opacity hover:opacity-100"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Column */}
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label className="mb-1 block text-slate-500">Barcode</Label>
                                    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
                                        {product.barcode || '-'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-1 block text-slate-500">QR Code</Label>
                                    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
                                        {product.qrCodeUrl ? (
                                            <img
                                                src={product.qrCodeUrl}
                                                alt="Product QR code"
                                                className="h-24 w-24"
                                            />
                                        ) : (
                                            '-'
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Characteristics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {product.characteristics && product.characteristics.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-950/50 uppercase text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Name</th>
                                                <th className="px-4 py-3 font-medium">Value</th>
                                                <th className="px-4 py-3 font-medium">Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
                                            {product.characteristics.map((char) => (
                                                <tr
                                                    key={char.id}
                                                    className="transition-colors hover:bg-slate-800/50"
                                                >
                                                    <td className="px-4 py-3 font-medium text-slate-200">
                                                        {char.name}
                                                    </td>
                                                    <td className="px-4 py-3">{char.value}</td>
                                                    <td className="px-4 py-3 text-slate-400">
                                                        {char.measurement || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm italic text-slate-400">
                                    No characteristics defined for this product.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
