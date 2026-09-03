'use client';

import { useEffect, useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import { ProductStatus, type ProductResponse } from '@inventory-system/shared-types';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';
import { api } from '@/lib/api';
import SearchableCategorySelect, { type CategoryOption } from './SearchableCategorySelect';

type EditableProduct = Pick<
    ProductResponse,
    'id' | 'baseName' | 'sku' | 'barcode' | 'status' | 'categoryId'
>;

interface ProductDetailsEditorProps {
    product: EditableProduct;
    categories: CategoryOption[];
    categoriesLoading?: boolean;
    categoriesError?: string;
    onRetryCategories?: () => void;
    onSaved: () => Promise<void> | void;
}

const statusHelp: Record<ProductStatus, string> = {
    [ProductStatus.DRAFT]: 'Hidden from sellable catalog results while you finish setup.',
    [ProductStatus.ACTIVE]: 'Sellable only when the selected version is also Active.',
    [ProductStatus.DISCONTINUED]:
        'Stops every version from being sellable without deleting history.',
};

export default function ProductDetailsEditor({
    product,
    categories,
    categoriesLoading = false,
    categoriesError,
    onRetryCategories,
    onSaved,
}: ProductDetailsEditorProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [baseName, setBaseName] = useState(product.baseName);
    const [sku, setSku] = useState(product.sku);
    const [barcode, setBarcode] = useState(product.barcode || '');
    const [categoryId, setCategoryId] = useState(product.categoryId);
    const [status, setStatus] = useState(product.status);

    const reset = () => {
        setBaseName(product.baseName);
        setSku(product.sku);
        setBarcode(product.barcode || '');
        setCategoryId(product.categoryId);
        setStatus(product.status);
        setError('');
    };

    useEffect(() => {
        if (!editing) reset();
        // Reset only after the parent refreshes the saved product.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product, editing]);

    const cancel = () => {
        reset();
        setEditing(false);
    };

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedName = baseName.trim();
        const normalizedSku = sku.trim();
        if (!normalizedName || !normalizedSku || !categoryId) {
            setError('Product name, SKU, and category are required.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await api.updateProduct(product.id, {
                baseName: normalizedName,
                sku: normalizedSku,
                barcode: barcode.trim() || null,
                categoryId,
                status,
            });
            await onSaved();
            setEditing(false);
        } catch (saveError: any) {
            setError(saveError?.message || 'Could not update this product');
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                    <p className="font-medium text-slate-200">Product details</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Change the product name, identifiers, category, or lifecycle state.
                    </p>
                </div>
                <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit product
                </Button>
            </div>
        );
    }

    return (
        <form
            onSubmit={save}
            className="space-y-5 rounded-xl border border-indigo-500/30 bg-slate-900 p-5"
            aria-label="Edit product details"
        >
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="font-semibold text-white">Edit product details</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Identifier changes are also applied to the primary version.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cancel editing"
                    onClick={cancel}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"
                >
                    {error}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="product-name">Product name</Label>
                    <Input
                        id="product-name"
                        required
                        maxLength={200}
                        value={baseName}
                        onChange={(event) => setBaseName(event.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="product-sku">Primary SKU</Label>
                    <Input
                        id="product-sku"
                        required
                        maxLength={100}
                        value={sku}
                        onChange={(event) => setSku(event.target.value)}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="product-barcode">Primary barcode</Label>
                    <Input
                        id="product-barcode"
                        maxLength={100}
                        value={barcode}
                        onChange={(event) => setBarcode(event.target.value)}
                        className="font-mono"
                        placeholder="Optional"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Category</Label>
                    <SearchableCategorySelect
                        categories={categories}
                        value={categoryId}
                        onChange={setCategoryId}
                        disabled={categoriesLoading || Boolean(categoriesError)}
                        placeholder={
                            categoriesLoading ? 'Loading categories…' : 'Search categories…'
                        }
                    />
                    {categoriesError && (
                        <div className="flex items-center justify-between gap-3 text-xs text-amber-300">
                            <span>{categoriesError}</span>
                            {onRetryCategories && (
                                <button
                                    type="button"
                                    className="font-semibold underline"
                                    onClick={onRetryCategories}
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="product-status">Product status</Label>
                    <select
                        id="product-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as ProductStatus)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={ProductStatus.DRAFT}>Draft</option>
                        <option value={ProductStatus.ACTIVE}>Active</option>
                        <option value={ProductStatus.DISCONTINUED}>Discontinued</option>
                    </select>
                    <p className="text-xs text-slate-500">{statusHelp[status]}</p>
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={cancel} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={saving || categoriesLoading || Boolean(categoriesError)}
                >
                    {saving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save changes
                </Button>
            </div>
        </form>
    );
}
