'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, Plus, Trash2, Save, UploadCloud } from 'lucide-react';
import Link from 'next/link';

interface CharacteristicInput {
    name: string;
    value: string;
    measurement: string;
}

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Data lists
    const [categories, setCategories] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);

    // Form State
    const [baseName, setBaseName] = useState('');
    const [sku, setSku] = useState('');
    const [barcode, setBarcode] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [status, setStatus] = useState('Draft');
    const [characteristics, setCharacteristics] = useState<CharacteristicInput[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, tempRes] = await Promise.all([
                    api.getCategories(),
                    api.getTemplates(),
                ]);
                if (catRes.success) setCategories(catRes.data || []);
                if (tempRes.success) setTemplates(tempRes.data || []);
            } catch (err) {
                console.error('Failed to load form dependencies', err);
            }
        };
        fetchData();
    }, []);

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

        const template = templates.find((t) => t.id === templateId);
        if (template && template.fields) {
            const newChars = template.fields.map((f: any) => ({
                name: f.name,
                value: '',
                measurement: f.measurement || '',
            }));
            setCharacteristics([...characteristics, ...newChars]);
        }
        // reset select
        e.target.value = '';
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
                return;
            }
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
                sku,
                barcode: barcode || undefined,
                categoryId,
                status,
                characteristics: characteristics.filter((c) => c.name && c.value),
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
                await api.uploadProductImage(newProductId, formData);
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
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                    {error}
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
                                <label className="text-sm font-medium text-slate-300">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={baseName}
                                    onChange={(e) => setBaseName(e.target.value)}
                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">
                                        SKU *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="PRD-12345"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">
                                        Barcode (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="812345678901"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">
                                        Category *
                                    </label>
                                    <select
                                        required
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">
                                        Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Active">Active</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h2 className="text-lg font-semibold text-white">
                                    Characteristics
                                </h2>
                                <select
                                    onChange={handleTemplateSelect}
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
                                                <input
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
                                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
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
                                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <input
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
                                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCharacteristic(index)}
                                                className="rounded-lg border border-transparent p-2 text-rose-500 transition-colors hover:border-rose-500/20 hover:bg-rose-500/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}

                                <button
                                    type="button"
                                    onClick={handleAddCharacteristic}
                                    className="flex items-center gap-2 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                                >
                                    <Plus className="h-4 w-4" /> Add Characteristic
                                </button>
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
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
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
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Save className="h-5 w-5" />
                                )}
                                Save Product
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
