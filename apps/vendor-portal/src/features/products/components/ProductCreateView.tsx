'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import {
    createProductRequestSchema,
    characteristicSchema,
    productStatusSchema,
    type ProductStatus,
} from '@inventory-system/contracts';
import { Alert, AlertDialog, Button, Card, CardContent, FileDropzone, PageHeader, Select } from '@inventory-system/ui';
import { useCategories } from '@/features/categories';
import { useTemplates } from '@/features/templates';
import SearchableCategorySelect from '@/components/SearchableCategorySelect';
import { useObjectUrl } from '@/hooks/use-object-url';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useCreateProduct, useUploadProductImage } from '../hooks';
import { validateProductImage } from '../utils/image';

interface ProductFormValues {
    baseName: string;
    sku: string;
    barcode: string;
    categoryId: string;
    status: ProductStatus;
    versionStatus: ProductStatus;
    designNotes: string;
    generateQrCode: boolean;
    characteristics: { name: string; value: string; measurement: string }[];
}

const initialValues: ProductFormValues = { baseName: '', sku: '', barcode: '', categoryId: '', status: 'DRAFT', versionStatus: 'DRAFT', designNotes: '', generateQrCode: false, characteristics: [] };
const productFormSchema = z.object({
    baseName: createProductRequestSchema.shape.baseName,
    sku: z.string().trim().max(100),
    barcode: z.string(),
    categoryId: createProductRequestSchema.shape.categoryId,
    status: productStatusSchema,
    versionStatus: productStatusSchema,
    designNotes: createProductRequestSchema.shape.designNotes.unwrap(),
    generateQrCode: z.boolean(),
    characteristics: z.array(characteristicSchema.required({ measurement: true })).max(100),
});

export const ProductCreateView = () => {
    const router = useRouter();
    const categories = useCategories();
    const templates = useTemplates();
    const createProduct = useCreateProduct();
    const uploadImage = useUploadProductImage();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [createdProductId, setCreatedProductId] = useState<string | null>(null);
    const [pendingFields, setPendingFields] = useState<ProductFormValues['characteristics'] | null>(null);
    const previewUrl = useObjectUrl(imageFile);
    const form = useAppForm({
        defaultValues: initialValues,
        validators: { onSubmit: productFormSchema },
        onSubmit: async ({ value }) => {
            setFormError(null);
            const parsed = createProductRequestSchema.safeParse({
                baseName: value.baseName,
                categoryId: value.categoryId,
                sku: value.sku || undefined,
                barcode: value.barcode || undefined,
                productStatus: value.status,
                versionStatus: value.versionStatus,
                designNotes: value.designNotes || undefined,
                generateQrCode: value.generateQrCode,
                characteristics: value.characteristics.filter((item) => item.name || item.value),
            });
            if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? 'Check the product details.'); return; }
            const response = await createProduct.mutateAsync(parsed.data).catch(() => null);
            if (!response) return;
            if (!imageFile) { router.push('/dashboard/products'); return; }
            try {
                await uploadImage.mutateAsync({ productId: response.data.id, file: imageFile });
                router.push('/dashboard/products');
            } catch {
                setCreatedProductId(response.data.id);
            }
        },
    });

    const dependencyError = categories.error || templates.error;
    if (createdProductId && imageFile) return <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Product created" description="The product is safe; only its image upload failed." />
        <Alert variant="warning">{getErrorMessage(uploadImage.error, 'The image could not be uploaded. Retry without creating another product.')}</Alert>
        <Card><CardContent className="flex flex-col gap-3 p-6 sm:flex-row">
            <Button disabled={uploadImage.isPending} onClick={() => uploadImage.mutate({ productId: createdProductId, file: imageFile }, { onSuccess: () => router.push(`/dashboard/products/${createdProductId}`) })}>Retry upload</Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/products/${createdProductId}`)}>Continue without image</Button>
        </CardContent></Card>
    </div>;

    return <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4"><Link href="/dashboard/products" aria-label="Back to products" className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></Link><PageHeader title="Add New Product" description="Create a new product listing in your catalog" /></div>
        {(formError || createProduct.error) && <Alert variant="danger">{formError || getErrorMessage(createProduct.error)}</Alert>}
        {dependencyError && <Alert variant="danger">{getErrorMessage(dependencyError, 'Could not load categories and templates.')} <Button type="button" onClick={() => { void categories.refetch(); void templates.refetch(); }}>Retry setup data</Button></Alert>}
        <AlertDialog open={pendingFields !== null} onOpenChange={(open) => { if (!open) setPendingFields(null); }} title="Replace characteristics?" description="This category has a default template. Replace the current characteristics, or cancel to keep them." confirmLabel="Load category template" onConfirm={() => { if (pendingFields) form.setFieldValue('characteristics', pendingFields); setPendingFields(null); }} />
        <form className="space-y-6" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
            <form.AppForm>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card><CardContent className="space-y-5 p-6">
                            <h2 className="border-b border-slate-800 pb-3 text-lg font-semibold text-white">Basic Information</h2>
                            <form.AppField name="baseName">{(field) => <field.TextField label="Product name" placeholder="Wireless Noise-Cancelling Headphones" serverError={getFieldIssue(createProduct.error, 'baseName')} />}</form.AppField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <form.AppField name="sku">{(field) => <field.TextField label="SKU" className="font-mono" placeholder="PRD-12345" serverError={getFieldIssue(createProduct.error, 'sku')} />}</form.AppField>
                                <form.AppField name="barcode">{(field) => <field.TextField label="Barcode (optional)" className="font-mono" placeholder="812345678901" serverError={getFieldIssue(createProduct.error, 'barcode')} />}</form.AppField>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <form.AppField name="categoryId">{(field) => <SearchableCategorySelect categories={categories.data ?? []} value={field.state.value} disabled={categories.isPending || Boolean(categories.error)} onChange={(id, category) => {
                                    field.handleChange(id);
                                    const template = templates.data?.find((item) => item.id === category.defaultTemplateId);
                                    if (!template) return;
                                    const fields = template.fields.map((item) => ({ name: item.name, value: '', measurement: item.measurement || '' }));
                                    if (form.getFieldValue('characteristics').length) setPendingFields(fields);
                                    else form.setFieldValue('characteristics', fields);
                                }} />}</form.AppField>
                                <form.AppField name="status">{(field) => <field.SelectField label="Product status"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="DISCONTINUED">Discontinued</option></field.SelectField>}</form.AppField>
                                <form.AppField name="versionStatus">{(field) => <field.SelectField label="Initial version status"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="DISCONTINUED">Discontinued</option></field.SelectField>}</form.AppField>
                                <form.AppField name="designNotes">{(field) => <field.TextField label="Design notes (optional)" />}</form.AppField>
                                <form.AppField name="generateQrCode">{(field) => <label className="text-sm text-slate-300"><input type="checkbox" checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)} /> Generate QR code</label>}</form.AppField>
                            </div>
                        </CardContent></Card>
                        <Card><CardContent className="space-y-5 p-6">
                            <form.AppField name="characteristics" mode="array">{(characteristicsField) => <fieldset className="space-y-3">
                                <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center"><legend className="text-lg font-semibold text-white">Characteristics</legend>
                                    <Select aria-label="Load characteristics from template" defaultValue="" onChange={(event) => { const template = templates.data?.find((item) => item.id === event.target.value); template?.fields.forEach((field) => characteristicsField.pushValue({ name: field.name, value: '', measurement: field.measurement ?? '' })); event.target.value = ''; }}><option value="" disabled>Load from template…</option>{(templates.data ?? []).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></div>
                                {characteristicsField.state.value.length === 0 && <p className="rounded-lg border border-dashed border-slate-800 py-4 text-center text-sm text-slate-500">No characteristics added yet.</p>}
                                {characteristicsField.state.value.map((_, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
                                    <form.AppField name={`characteristics[${index}].name`}>{(field) => <field.TextField label={`Name ${index + 1}`} placeholder="Color" serverError={getFieldIssue(createProduct.error, `characteristics[${index}].name`)} />}</form.AppField>
                                    <form.AppField name={`characteristics[${index}].value`}>{(field) => <field.TextField label="Value" placeholder="Red" serverError={getFieldIssue(createProduct.error, `characteristics[${index}].value`)} />}</form.AppField>
                                    <form.AppField name={`characteristics[${index}].measurement`}>{(field) => <field.TextField label="Unit" placeholder="cm" serverError={getFieldIssue(createProduct.error, `characteristics[${index}].measurement`)} />}</form.AppField>
                                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove characteristic ${index + 1}`} onClick={() => characteristicsField.removeValue(index)} className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>
                                </div>)}
                                <Button type="button" variant="link" className="px-0" onClick={() => characteristicsField.pushValue({ name: '', value: '', measurement: '' })}><Plus className="mr-2 h-4 w-4" /> Add characteristic</Button>
                            </fieldset>}</form.AppField>
                        </CardContent></Card>
                    </div>
                    <div className="space-y-6">
                        <Card><CardContent className="space-y-4 p-6"><h2 className="border-b border-slate-800 pb-3 text-lg font-semibold text-white">Product Image</h2>
                            <FileDropzone label="Upload primary image" description="JPEG, PNG or WebP, up to 2 MB" accept="image/jpeg,image/png,image/webp" onFileChange={(file) => { if (!file) { setImageFile(null); setImageError(null); return; } const error = validateProductImage(file); setImageError(error); setImageFile(error ? null : file); }}
                                preview={previewUrl ? <Image src={previewUrl} alt="Selected product preview" fill unoptimized className="object-cover" /> : undefined} />
                            {imageError && <Alert variant="danger">{imageError}</Alert>}
                        </CardContent></Card>
                        <Card><CardContent className="p-6"><form.SubmitButton disabled={categories.isPending || Boolean(categories.error) || Boolean(imageError)} className="w-full" pendingLabel="Saving product…"><Save className="mr-2 h-5 w-5" /> Save Product</form.SubmitButton></CardContent></Card>
                    </div>
                </div>
            </form.AppForm>
        </form>
    </div>;
};
