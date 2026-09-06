'use client';

import { useState } from 'react';
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs';
import { z } from 'zod';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { createTemplateRequestSchema, type Template } from '@inventory-system/contracts';
import {
    Alert, AlertDialog, Badge, Button, Card, CardContent, CardHeader, CardTitle,
    EmptyState, Input, PageHeader, Skeleton,
} from '@inventory-system/ui';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useCreateTemplate, useDeleteTemplate, useDuplicateTemplate, useUpdateTemplate, useTemplates } from '../hooks';

const templateFormSchema = z.object({
    name: createTemplateRequestSchema.shape.name,
    fields: z.array(z.object({ name: z.string().trim().min(1, 'Field name is required'), measurement: z.string() })).min(1, 'Add at least one field'),
});

export const TemplatesView = () => {
    const [showForm, setShowForm] = useQueryState('create', parseAsBoolean.withDefault(false));
    const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
    const [pendingDelete, setPendingDelete] = useState<Template | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const templates = useTemplates();
    const createTemplate = useCreateTemplate();
    const deleteTemplate = useDeleteTemplate();
    const duplicateTemplate = useDuplicateTemplate();
    const updateTemplate = useUpdateTemplate();
    const saveTemplate = editingId ? updateTemplate : createTemplate;
    const visibleTemplates = (templates.data ?? []).filter((template) =>
        [template.name, ...template.fields.map((field) => field.name)].join(' ').toLowerCase().includes(search.toLowerCase()));
    const form = useAppForm({
        defaultValues: { name: '', fields: [{ name: '', measurement: '' }] },
        validators: { onSubmit: templateFormSchema },
        onSubmit: async ({ value }) => {
            try {
                const body = createTemplateRequestSchema.parse(value);
                if (editingId) await updateTemplate.mutateAsync({ id: editingId, body });
                else await createTemplate.mutateAsync(body);
            } catch { return; }
            form.reset();
            setEditingId(null);
            setShowForm(false);
        },
    });

    if (templates.isPending) return <div className="space-y-6"><Skeleton className="h-16" /><Skeleton className="h-72" /></div>;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader title="Characteristic Templates" description="Create reusable sets of characteristics for faster product entry" actions={
                <Button type="button" onClick={() => { setEditingId(null); form.reset(); createTemplate.reset(); void setShowForm(!showForm); }}><Plus className="mr-2 h-4 w-4" /> Create Template</Button>
            } />
            {templates.error && <Alert variant="danger">{getErrorMessage(templates.error)} <Button onClick={() => { void templates.refetch(); }}>Retry templates</Button></Alert>}
            {duplicateTemplate.error && <Alert variant="danger">{getErrorMessage(duplicateTemplate.error)}</Alert>}
            <Input aria-label="Search templates" value={search} onChange={(event) => { void setSearch(event.target.value); }} placeholder="Search templates and field names" />
            {showForm && (
                <Card>
                    <CardHeader><CardTitle>{editingId ? 'Edit Template' : 'New Template'}</CardTitle></CardHeader>
                    <CardContent>
                        {saveTemplate.error && <Alert variant="danger" className="mb-4">{getErrorMessage(saveTemplate.error)}</Alert>}
                        <form className="space-y-5" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
                            <form.AppForm>
                                <form.AppField name="name">
                                    {(field) => <field.TextField label="Template name" placeholder="e.g. Laptops" serverError={getFieldIssue(createTemplate.error, 'name')} />}
                                </form.AppField>
                                <form.AppField name="fields" mode="array">
                                    {(fieldsField) => (
                                        <fieldset className="space-y-3">
                                            <legend className="text-sm font-medium text-slate-200">Fields</legend>
                                            {fieldsField.state.value.map((_, index) => (
                                                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                                                    <form.AppField name={`fields[${index}].name`}>
                                                        {(field) => <field.TextField label={`Field ${index + 1}`} placeholder="e.g. RAM" serverError={getFieldIssue(createTemplate.error, `fields[${index}].name`)} />}
                                                    </form.AppField>
                                                    <form.AppField name={`fields[${index}].measurement`}>
                                                        {(field) => <field.TextField label="Unit" placeholder="e.g. GB" serverError={getFieldIssue(createTemplate.error, `fields[${index}].measurement`)} />}
                                                    </form.AppField>
                                                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove field ${index + 1}`}
                                                        disabled={fieldsField.state.value.length === 1} onClick={() => fieldsField.removeValue(index)}
                                                        className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="link" className="px-0" onClick={() => fieldsField.pushValue({ name: '', measurement: '' })}>
                                                <Plus className="mr-1 h-4 w-4" /> Add field
                                            </Button>
                                        </fieldset>
                                    )}
                                </form.AppField>
                                <div className="flex justify-end border-t border-slate-800 pt-4">
                                    <form.SubmitButton pendingLabel="Saving…">Save Template</form.SubmitButton>
                                </div>
                            </form.AppForm>
                        </form>
                    </CardContent>
                </Card>
            )}
            {visibleTemplates.length === 0 && !templates.error ? (
                <EmptyState icon={<FileText className="h-9 w-9" />} title="No templates yet" description="Create one to speed up product entry." />
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    {visibleTemplates.map((template) => (
                        <Card key={template.id} className="group relative transition-colors hover:border-slate-700">
                            <CardContent className="p-5">
                                {template.vendorProfileId && <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${template.name}`}
                                    onClick={() => { deleteTemplate.reset(); setPendingDelete(template); }} className="absolute right-4 top-4 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400">
                                    <Trash2 className="h-4 w-4" />
                                </Button>}
                                <div className="mb-4 flex items-center gap-3 pr-9">
                                    <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><FileText className="h-5 w-5" /></div>
                                    <h2 className="font-medium text-white">{template.name}</h2>
                                </div>
                                <p className="mb-3 text-sm text-slate-400">{template.fields.length} fields defined</p>
                                <Badge variant="outline">{template.vendorProfileId ? 'Custom' : 'System · Read only'}</Badge>
                                {template.vendorProfileId && <Button type="button" variant="link" onClick={() => {
                                    setEditingId(template.id); updateTemplate.reset();
                                    form.reset({ name: template.name, fields: template.fields.map((field) => ({ name: field.name, measurement: field.measurement || '' })) });
                                    void setShowForm(true);
                                }}>Edit {template.name}</Button>}
                                {!template.vendorProfileId && <Button type="button" variant="link" disabled={duplicateTemplate.isPending} onClick={() => duplicateTemplate.mutate(template.id)}>Duplicate {template.name} as custom</Button>}
                                <div className="flex flex-wrap gap-2">
                                    {template.fields.slice(0, 3).map((field) => <Badge key={`${field.name}-${field.measurement}`} variant="outline">{field.name}</Badge>)}
                                    {template.fields.length > 3 && <span className="py-1 text-xs text-slate-500">+{template.fields.length - 3} more</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)} title="Delete template?"
                description={`Delete ${pendingDelete?.name ?? 'this template'}? Products already created from it are unaffected.`}
                confirmLabel="Delete template" pending={deleteTemplate.isPending} onConfirm={() => {
                    if (!pendingDelete) return;
                    deleteTemplate.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
                }}>
                {deleteTemplate.error && <Alert variant="danger">{getErrorMessage(deleteTemplate.error)}</Alert>}
            </AlertDialog>
        </div>
    );
};
