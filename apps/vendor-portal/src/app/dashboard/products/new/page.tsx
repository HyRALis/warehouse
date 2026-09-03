'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, UploadCloud } from 'lucide-react';
import { Input, Button, Label, Spinner, Card, CardContent } from '@inventory-system/ui';
import { ProductStatus } from '@inventory-system/shared-types';
import SearchableCategorySelect, { CategoryOption } from '@/components/SearchableCategorySelect';

interface CharacteristicInput {
    name: string;
    value: string;
    measurement: string;
}

interface TemplateField {
    name: string;
    measurement?: string;
}

interface ProductTemplate {
    id: string;
    name: string;
    fields: TemplateField[];
}

interface ProductCategory extends CategoryOption {
    defaultTemplate?: ProductTemplate | null;
}

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Data lists
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [templates, setTemplates] = useState<ProductTemplate[]>([]);
    const [dependenciesLoading, setDependenciesLoading] = useState(true);
    const [dependenciesError, setDependenciesError] = useState('');

    // Form State
    const [baseName, setBaseName] = useState('');
    const [sku, setSku] = useState('');
    const [barcode, setBarcode] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [productStatus, setProductStatus] = useState<ProductStatus>(ProductStatus.DRAFT);
    const [versionStatus, setVersionStatus] = useState<ProductStatus>(ProductStatus.DRAFT);
    const [characteristics, setCharacteristics] = useState<CharacteristicInput[]>([]);
    const [designNotes, setDesignNotes] = useState('');
    const [generateQrCode, setGenerateQrCode] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');

    const fetchDependencies = useCallback(async () => {
        setDependenciesLoading(true);
        setDependenciesError('');
        try {
            const [categoryResponse, templateResponse] = await Promise.all([
                api.getCategories(),
                api.getTemplates(),
            ]);
            if (!categoryResponse.success || !templateResponse.success) {
                throw new Error('The product catalog options could not be loaded.');
            }
            setCategories(categoryResponse.data || []);
            setTemplates(templateResponse.data || []);
        } catch (dependencyError: any) {
            setDependenciesError(
                dependencyError?.message || 'The product catalog options could not be loaded.'
            );
        } finally {
            setDependenciesLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchDependencies();
    }, [fetchDependencies]);

    const handleAddCharacteristic = () => {
        setCharacteristics([...characteristics, { name: '', value: '', measurement: '' }]);
    };

    const handleRemoveCharacteristic = (index: number) => {
        const newChars = [...characteristics];
        newChars.splice(index, 1);
        setCharacteristics(newChars);
    };

    const handleCharacteristicChange = (
        index: number,
        field: keyof CharacteristicInput,
        value: string
    ) => {
        const newChars = [...characteristics];
        newChars[index][field] = value;
        setCharacteristics(newChars);
    };

    const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        if (!templateId) return;

        const template = templates.find((item) => item.id === templateId);
        if (template && template.fields) {
            const newChars = template.fields.map((field) => ({
                name: field.name,
                value: '',
                measurement: field.measurement || '',
            }));
            setCharacteristics([...characteristics, ...newChars]);
        }
        // reset select
        e.target.value = '';
    };

    const handleCategoryChange = (nextCategoryId: string) => {
        const exactCategory = categories.find((category) => category.id === nextCategoryId);
        const defaultTemplate = exactCategory?.defaultTemplate;

        if (categoryId && characteristics.length > 0) {
            const preserve = window.confirm(
                'Keep the characteristics you already entered? Select Cancel to replace them with the new category defaults.'
            );
            if (!preserve) {
                setCharacteristics(
                    (defaultTemplate?.fields || []).map((field) => ({
                        name: field.name,
                        value: '',
                        measurement: field.measurement || '',
                    }))
                );
            }
        } else if (defaultTemplate?.fields) {
            setCharacteristics(
                defaultTemplate.fields.map((field) => ({
                    name: field.name,
                    value: '',
                    measurement: field.measurement || '',
                }))
            );
        }

        setCategoryId(nextCategoryId);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError('Choose a JPEG, PNG, or WebP image.');
                e.target.value = '';
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                setError('Image must be 2 MB or smaller.');
                e.target.value = '';
                return;
            }
            setError('');
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId) {
            setError('Category is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create Product
            const productData = {
                baseName,
                sku: sku.trim() || undefined,
                barcode: barcode || undefined,
                categoryId,
                productStatus,
                versionStatus,
                designNotes: designNotes.trim() || undefined,
                generateQrCode,
                characteristics: characteristics.filter((c) => c.name),
            };

            const res = await api.createProduct(productData);

            if (!res.success || !res.data) {
                throw new Error(res.message || 'Failed to create product');
            }

            const newProductId = res.data.id;

            // 2. Upload Image if exists
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                formData.append('isPrimary', 'true');
                try {
                    await api.uploadProductImage(newProductId, formData);
                } catch (uploadError: any) {
                    sessionStorage.setItem(
                        'productCreationNotice',
                        uploadError?.message ||
                            'The product was created, but its image could not be uploaded. You can add it from the product page.'
                    );
                }
            }

            router.push('/dashboard/products');
        } catch (err: any) {
            setError(err.message || 'An error occurred while creating the product');
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="mb-2 flex items-center gap-4">
                <Link
                    href="/dashboard/products"
                    className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:bg-slate-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Add New Product</h1>
                    <p className="text-sm text-slate-400">
                        Create a new product listing in your catalog
                    </p>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400"
                >
                    {error}
                </div>
            )}

            {dependenciesError && (
                <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"
                >
                    <span>{dependenciesError}</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchDependencies()}
                    >
                        Retry loading options
                    </Button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Info */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
                            <h2 className="border-b border-slate-800 pb-3 text-lg font-semibold text-white">
                                Basic Information
                            </h2>

                            <div className="space-y-1.5">
                                <Label>Product Name *</Label>
                                <Input
                                    type="text"
                                    required
                                    value={baseName}
                                    onChange={(e) => setBaseName(e.target.value)}
                                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>SKU (Optional)</Label>
                                    <Input
                                        type="text"
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                        className="font-mono"
                                        placeholder="Leave blank to generate"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Barcode (Optional)</Label>
                                    <Input
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        className="font-mono"
                                        placeholder="812345678901"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Category *</Label>
                                    <SearchableCategorySelect
                                        categories={categories}
                                        value={categoryId}
                                        onChange={handleCategoryChange}
                                        disabled={dependenciesLoading || Boolean(dependenciesError)}
                                        placeholder={
                                            dependenciesLoading
                                                ? 'Loading categories…'
                                                : 'Search categories…'
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Product Status</Label>
                                    <select
                                        aria-label="Product status"
                                        value={productStatus}
                                        onChange={(e) =>
                                            setProductStatus(e.target.value as ProductStatus)
                                        }
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value={ProductStatus.DRAFT}>Draft</option>
                                        <option value={ProductStatus.ACTIVE}>Active</option>
                                        <option value={ProductStatus.DISCONTINUED}>
                                            Discontinued
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Initial Version Status</Label>
                                    <select
                                        aria-label="Initial version status"
                                        value={versionStatus}
                                        onChange={(e) =>
                                            setVersionStatus(e.target.value as ProductStatus)
                                        }
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value={ProductStatus.DRAFT}>Draft</option>
                                        <option value={ProductStatus.ACTIVE}>Active</option>
                                        <option value={ProductStatus.DISCONTINUED}>
                                            Discontinued
                                        </option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-3 self-end rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={generateQrCode}
                                        onChange={(event) =>
                                            setGenerateQrCode(event.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
                                    />
                                    Generate a QR code
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Design Notes (Optional)</Label>
                                <textarea
                                    value={designNotes}
                                    onChange={(event) => setDesignNotes(event.target.value)}
                                    maxLength={5000}
                                    rows={4}
                                    placeholder="Describe packaging, materials, artwork, or other version-specific details."
                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h2 className="text-lg font-semibold text-white">
                                    Characteristics
                                </h2>
                                <select
                                    onChange={handleTemplateSelect}
                                    disabled={dependenciesLoading || Boolean(dependenciesError)}
                                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>
                                        Load from template...
                                    </option>
                                    {templates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                {characteristics.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-slate-800 py-4 text-center text-sm italic text-slate-500">
                                        No characteristics added yet.
                                    </p>
                                ) : (
                                    characteristics.map((char, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <Input
                                                    type="text"
                                                    placeholder="Name (e.g. Color)"
                                                    value={char.name}
                                                    onChange={(e) =>
                                                        handleCharacteristicChange(
                                                            index,
                                                            'name',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    type="text"
                                                    placeholder="Value (e.g. Red)"
                                                    value={char.value}
                                                    onChange={(e) =>
                                                        handleCharacteristicChange(
                                                            index,
                                                            'value',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="w-24">
                                                <Input
                                                    type="text"
                                                    placeholder="Unit"
                                                    value={char.measurement}
                                                    onChange={(e) =>
                                                        handleCharacteristicChange(
                                                            index,
                                                            'measurement',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveCharacteristic(index)}
                                                className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}

                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={handleAddCharacteristic}
                                    className="px-0"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Characteristic
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Image */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                            <h2 className="mb-5 border-b border-slate-800 pb-3 text-lg font-semibold text-white">
                                Product Image
                            </h2>

                            <div className="space-y-4">
                                <div className="group relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-800 bg-slate-950">
                                    {imagePreview ? (
                                        <>
                                            <Image
                                                src={imagePreview}
                                                alt="Product image preview"
                                                fill
                                                unoptimized
                                                loader={({ src }) => src}
                                                sizes="(min-width: 1024px) 25vw, 100vw"
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                <p className="text-sm font-medium text-white">
                                                    Click to change
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                                            <UploadCloud className="mb-3 h-10 w-10 text-slate-600" />
                                            <p className="mb-1 text-sm font-medium text-slate-300">
                                                Upload primary image
                                            </p>
                                            <p className="text-xs">JPEG, PNG, WEBP up to 2MB</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg, image/png, image/webp"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                            <Button
                                type="submit"
                                disabled={
                                    loading || dependenciesLoading || Boolean(dependenciesError)
                                }
                                className="w-full"
                            >
                                {loading ? (
                                    <Spinner size={5} className="mr-2" />
                                ) : (
                                    <Save className="mr-2 h-5 w-5" />
                                )}
                                Save Product
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
