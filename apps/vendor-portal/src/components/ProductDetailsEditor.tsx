'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Edit3, Save } from 'lucide-react';
import { type Product, updateProductRequestSchema } from '@inventory-system/contracts';
import { Alert, Button } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { getErrorMessage } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import SearchableCategorySelect, { type CategoryOption } from './SearchableCategorySelect';

interface ProductDetailsEditorProps {
    product: Pick<Product, 'id' | 'baseName' | 'sku' | 'barcode' | 'status' | 'categoryId'>;
    categories: CategoryOption[];
    categoriesLoading?: boolean;
    categoriesError?: string;
    onRetryCategories?: () => void;
    onSaved: () => Promise<void> | void;
}

export const ProductDetailsEditor = ({ product, categories, categoriesLoading = false,
    categoriesError, onRetryCategories, onSaved }: ProductDetailsEditorProps): React.JSX.Element => {
    const [editing, setEditing] = useState(false);
    const update = useMutation({
        mutationFn: (body: Parameters<typeof browserApi.products.update>[1]) =>
            browserApi.products.update(product.id, body),
        onSuccess: async () => { await onSaved(); setEditing(false); },
    });
    const values = { baseName: product.baseName, sku: product.sku, barcode: product.barcode || '',
        categoryId: product.categoryId, status: product.status };
    const form = useAppForm({
        defaultValues: values,
        validators: { onSubmit: ({ value }) => {
            const parsed = updateProductRequestSchema.safeParse({ ...value, barcode: value.barcode.trim() || null });
            return parsed.success ? undefined : parsed.error.issues.map((issue) => issue.message).join('. ');
        } },
        onSubmit: async ({ value }) => {
            await update.mutateAsync(updateProductRequestSchema.parse({
                ...value, barcode: value.barcode.trim() || null,
            })).catch(() => undefined);
        },
    });
    const cancel = (): void => { form.reset(values); update.reset(); setEditing(false); };

    if (!editing) return (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center">
            <div><p className="font-medium text-slate-200">Product details</p>
                <p className="mt-1 text-sm text-slate-500">Change the name, identifiers, category, or lifecycle state.</p></div>
            <Button variant="outline" onClick={() => { form.reset(values); setEditing(true); }}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit product
            </Button>
        </div>
    );
    return (
        <form aria-label="Edit product details" className="space-y-5 rounded-xl border border-indigo-500/30 bg-slate-900 p-5"
            onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
            <h2 className="font-semibold text-white">Edit product details</h2>
            <p className="text-sm text-slate-400">Identifier changes also apply to the primary version. Existing characteristics are preserved.</p>
            {update.error && <Alert variant="danger" role="alert">{getErrorMessage(update.error)}</Alert>}
            <form.Subscribe selector={(state) => state.errors}>{(errors) => errors.length > 0 ? <Alert variant="danger" role="alert">{errors.join('. ')}</Alert> : null}</form.Subscribe>
            <form.AppForm>
                <div className="grid gap-4 sm:grid-cols-2">
                    <form.AppField name="baseName">{(field) => <field.TextField label="Product name" required maxLength={200} />}</form.AppField>
                    <form.AppField name="sku">{(field) => <field.TextField label="Primary SKU" required maxLength={100} />}</form.AppField>
                    <form.AppField name="barcode">{(field) => <field.TextField label="Primary barcode" maxLength={100} />}</form.AppField>
                    <form.AppField name="categoryId">{(field) => <SearchableCategorySelect categories={categories} value={field.state.value}
                        onChange={(id) => field.handleChange(id)} disabled={categoriesLoading || Boolean(categoriesError)} />}</form.AppField>
                    <form.AppField name="status">{(field) => <field.SelectField label="Product status">
                        <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="DISCONTINUED">Discontinued</option>
                    </field.SelectField>}</form.AppField>
                </div>
                {categoriesError && <Alert variant="warning">{categoriesError} <Button type="button" onClick={onRetryCategories}>Retry</Button></Alert>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" disabled={update.isPending} onClick={cancel}>Cancel</Button>
                    <form.SubmitButton disabled={categoriesLoading || Boolean(categoriesError)} pendingLabel="Saving changes…">
                        <Save className="mr-2 h-4 w-4" /> Save changes
                    </form.SubmitButton>
                </div>
            </form.AppForm>
        </form>
    );
};
