'use client';

import { useState } from 'react';
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs';
import { partition } from 'es-toolkit';
import { z } from 'zod';
import { FolderTree, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { createCategoryRequestSchema, type Category } from '@inventory-system/contracts';
import {
    Alert, AlertDialog, Badge, Button, Card, CardContent, CardHeader, CardTitle,
    EmptyState, Input, PageHeader, Skeleton,
} from '@inventory-system/ui';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useCurrentVendor } from '@/features/auth/queries';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks';

const categoryFormSchema = z.object({ name: createCategoryRequestSchema.shape.name, parentId: z.string() });

const CategoryList = ({ categories, system, onDelete, onEdit }: {
    categories: Category[];
    system?: boolean;
    onDelete?: (category: Category) => void;
    onEdit?: (category: Category) => void;
}) => (
    <Card className={system ? 'overflow-hidden opacity-80' : 'overflow-hidden'}>
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 p-4">
            {system ? <ShieldAlert className="h-5 w-5 text-slate-400" /> : <FolderTree className="h-5 w-5 text-indigo-400" />}
            <h2 className="font-semibold text-slate-200">{system ? 'System Categories' : 'Your Categories'}</h2>
        </div>
        <CardContent className="max-h-96 divide-y divide-slate-800 overflow-y-auto p-0">
            {categories.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                    {system ? 'No system categories available.' : 'No custom categories created yet.'}
                </p>
            ) : categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-3 p-4">
                    <span className="font-medium text-slate-200">{category.name}</span>
                    {!system && <Button variant="link" onClick={() => onEdit?.(category)}>Edit {category.name}</Button>}
                    {system ? <Badge variant="outline">System</Badge> : (
                        <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${category.name}`}
                            onClick={() => onDelete?.(category)} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
        </CardContent>
    </Card>
);

export const CategoriesView = () => {
    const [showForm, setShowForm] = useQueryState('create', parseAsBoolean.withDefault(false));
    const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
    const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const vendor = useCurrentVendor().data;
    const categories = useCategories();
    const createCategory = useCreateCategory();
    const deleteCategory = useDeleteCategory();
    const updateCategory = useUpdateCategory();
    const saveCategory = editingId ? updateCategory : createCategory;
    const form = useAppForm({
        defaultValues: { name: '', parentId: '' },
        validators: { onSubmit: categoryFormSchema },
        onSubmit: async ({ value }) => {
            const body = createCategoryRequestSchema.parse({ name: value.name, parentId: value.parentId || null });
            try {
                if (editingId) await updateCategory.mutateAsync({ id: editingId, body: { name: body.name, parentId: body.parentId } });
                else await createCategory.mutateAsync(body);
            } catch { return; }
            form.reset();
            setEditingId(null);
            setShowForm(false);
        },
    });

    if (categories.isPending) return <div className="space-y-6"><Skeleton className="h-16" /><Skeleton className="h-80" /></div>;

    const visibleCategories = (categories.data ?? []).filter((category) =>
        [category.name, category.code, ...(category.aliases ?? [])].join(' ').toLowerCase().includes(search.toLowerCase()));
    const [vendorCategories, systemCategories] = partition(visibleCategories, (category) => category.vendorProfileId === vendor?.id);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader title="Categories" description="Organize your products with categories" actions={
                <Button type="button" onClick={() => { setEditingId(null); form.reset(); createCategory.reset(); void setShowForm(!showForm); }}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            } />
            {categories.error && <Alert variant="danger">{getErrorMessage(categories.error)} <Button onClick={() => { void categories.refetch(); }}>Retry categories</Button></Alert>}
            <Input aria-label="Search categories" value={search} onChange={(event) => { void setSearch(event.target.value); }} placeholder="Search names, codes and aliases" />
            {showForm && (
                <Card>
                    <CardHeader><CardTitle>{editingId ? 'Edit Category' : 'Create New Category'}</CardTitle></CardHeader>
                    <CardContent>
                        {saveCategory.error && <Alert variant="danger" className="mb-4">{getErrorMessage(saveCategory.error)}</Alert>}
                        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
                            <form.AppForm>
                                <form.AppField name="name" validators={{ onBlur: createCategoryRequestSchema.shape.name }}>
                                    {(field) => <field.TextField label="Name" placeholder="Category name" serverError={getFieldIssue(createCategory.error, 'name')} />}
                                </form.AppField>
                                <form.AppField name="parentId">
                                    {(field) => <field.SelectField label="Parent category (optional)" serverError={getFieldIssue(createCategory.error, 'parentId')}>
                                        <option value="">None (top level)</option>
                                        {(categories.data ?? []).filter((category) => category.id !== editingId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                    </field.SelectField>}
                                </form.AppField>
                                <form.SubmitButton pendingLabel="Saving…">Save</form.SubmitButton>
                            </form.AppForm>
                        </form>
                    </CardContent>
                </Card>
            )}
            {!categories.error && (categories.data?.length ?? 0) === 0 ? (
                <EmptyState icon={<FolderTree className="h-9 w-9" />} title="No categories yet" />
            ) : <div className="grid gap-6 md:grid-cols-2">
                <CategoryList categories={vendorCategories} onDelete={(category) => { deleteCategory.reset(); setPendingDelete(category); }} onEdit={(category) => {
                    setEditingId(category.id); updateCategory.reset(); form.reset({ name: category.name, parentId: category.parentId || '' }); void setShowForm(true);
                }} />
                <CategoryList categories={systemCategories} system />
            </div>}
            <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Delete category?" description={`Delete ${pendingDelete?.name ?? 'this category'}? Categories linked to products cannot be deleted.`}
                confirmLabel="Delete category" pending={deleteCategory.isPending} onConfirm={() => {
                    if (!pendingDelete) return;
                    deleteCategory.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
                }}>
                {deleteCategory.error && <Alert variant="danger">{getErrorMessage(deleteCategory.error)}</Alert>}
            </AlertDialog>
        </div>
    );
};
