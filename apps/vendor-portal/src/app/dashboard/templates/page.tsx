'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Copy, Edit3, FileText, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input, Label, Spinner } from '@inventory-system/ui';
import type { TemplateField, TemplateResponse } from '@inventory-system/shared-types';

type CharacteristicTemplate = TemplateResponse & {
    _count?: { defaultForCategories: number };
};

const emptyField = (): TemplateField => ({ name: '', measurement: '' });

function TemplateCard({ template, duplicating = false, onEdit, onDelete, onDuplicate }: {
    template: CharacteristicTemplate;
    duplicating?: boolean;
    onEdit: (template: CharacteristicTemplate) => void;
    onDelete: (template: CharacteristicTemplate) => void;
    onDuplicate: (template: CharacteristicTemplate) => void;
}) {
    const editable = Boolean(template.vendorProfileId);
    const usage = template._count?.defaultForCategories ?? 0;
    return (
        <Card className="h-full transition-colors hover:border-slate-700">
            <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><FileText className="h-5 w-5" /></div>
                        <div className="min-w-0"><h3 className="truncate font-medium text-white">{template.name}</h3>{template.key && <p className="truncate font-mono text-xs text-slate-600">{template.key}</p>}</div>
                    </div>
                    <Badge variant="outline">{editable ? 'Custom' : 'System'}</Badge>
                </div>
                <div className="mb-3 flex gap-4 text-xs text-slate-500"><span>{template.fields?.length || 0} fields</span><span>Default for {usage} categories</span></div>
                <div className="mb-5 flex flex-wrap gap-2">
                    {template.fields?.slice(0, 4).map((field, index) => <Badge key={`${field.name}-${index}`} variant="outline">{field.name}{field.measurement ? ` (${field.measurement})` : ''}</Badge>)}
                    {template.fields?.length > 4 && <span className="py-1 text-xs text-slate-500">+{template.fields.length - 4} more</span>}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-3">
                    {editable ? (
                        <><Button variant="ghost" size="sm" onClick={() => onEdit(template)}><Edit3 className="mr-2 h-4 w-4" /> Edit</Button><Button variant="ghost" size="icon" aria-label={`Delete ${template.name}`} onClick={() => onDelete(template)} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></Button></>
                    ) : (
                        <><span className="flex items-center gap-1 text-xs text-slate-600"><ShieldCheck className="h-4 w-4" /> Read only</span><Button variant="outline" size="sm" disabled={duplicating} onClick={() => onDuplicate(template)}>{duplicating ? <Spinner size={4} className="mr-2" /> : <Copy className="mr-2 h-4 w-4" />} {duplicating ? 'Duplicating…' : 'Duplicate as custom'}</Button></>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<CharacteristicTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [notice, setNotice] = useState('');
    const [query, setQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [fields, setFields] = useState<TemplateField[]>([emptyField()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoadError('');
        setLoading(true);
        try {
            const response = await api.getTemplates();
            setTemplates(response.data || []);
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load field templates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchTemplates();
        if (new URLSearchParams(window.location.search).get('create') === 'true') setShowForm(true);
    }, [fetchTemplates]);

    const startCreate = () => { setEditingId(null); setName(''); setFields([emptyField()]); setActionError(''); setNotice(''); setShowForm(true); };
    const startEdit = (template: CharacteristicTemplate) => { setEditingId(template.id); setName(template.name); setFields(template.fields.length ? template.fields : [emptyField()]); setActionError(''); setNotice(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const closeForm = () => { setShowForm(false); setEditingId(null); setName(''); setFields([emptyField()]); };

    const updateField = (index: number, key: keyof TemplateField, value: string) => setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field));
    const removeField = (index: number) => setFields((current) => current.length === 1 ? [emptyField()] : current.filter((_, fieldIndex) => fieldIndex !== index));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setActionError('');
        setNotice('');
        const validFields = fields.filter((field) => field.name.trim()).map((field) => ({ name: field.name.trim(), ...(field.measurement?.trim() && { measurement: field.measurement.trim() }) }));
        try {
            if (editingId) await api.updateTemplate(editingId, { name: name.trim(), fields: validFields }); else await api.createTemplate({ name: name.trim(), fields: validFields });
            closeForm();
            await fetchTemplates();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not save template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDuplicate = async (template: CharacteristicTemplate) => {
        setDuplicatingId(template.id);
        setActionError('');
        setNotice('');
        try {
            await api.duplicateTemplate(template.id);
            await fetchTemplates();
            setNotice(`“${template.name}” was duplicated as a custom template.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not duplicate template');
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleDelete = async (template: CharacteristicTemplate) => {
        if (!window.confirm(`Delete “${template.name}”?`)) return;
        setActionError('');
        setNotice('');
        try {
            await api.deleteTemplate(template.id);
            await fetchTemplates();
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Could not delete template');
        }
    };

    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        if (!needle) return templates;
        return templates.filter((template) => [template.name, template.key, ...template.fields.map((field) => field.name)].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(needle)));
    }, [templates, query]);
    const customTemplates = filtered.filter((template) => template.vendorProfileId);
    const systemTemplates = filtered.filter((template) => !template.vendorProfileId);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-400"><FileText className="h-4 w-4" /> Advanced setup</div><h1 className="text-2xl font-bold text-white">Field templates</h1><p className="mt-1 text-sm text-slate-400">Reuse product characteristics. Start with a system template and customize only what you need.</p></div>
                <Button onClick={startCreate} disabled={loading || Boolean(loadError)}><Plus className="mr-2 h-4 w-4" /> Create custom template</Button>
            </header>

            {loadError && (
                <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
                    <span>{loadError}</span>
                    <Button variant="secondary" size="sm" onClick={() => void fetchTemplates()}>Try again</Button>
                </div>
            )}
            {actionError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{actionError}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

            {loading && <div className="flex justify-center p-20" role="status" aria-label="Loading templates"><Spinner size={8} /></div>}

            {!loading && !loadError && showForm && (
                <Card><CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-white">{editingId ? 'Edit custom template' : 'New custom template'}</h2><Button variant="ghost" size="icon" aria-label="Close template form" onClick={closeForm}><X className="h-4 w-4" /></Button></div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5"><Label htmlFor="template-name">Template name</Label><Input id="template-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Handmade candles" /></div>
                        <fieldset><legend className="mb-2 text-sm font-medium text-slate-200">Fields</legend><div className="space-y-2">{fields.map((field, index) => <div key={index} className="flex gap-2"><Input aria-label={`Field ${index + 1} name`} required={index === 0} value={field.name} onChange={(event) => updateField(index, 'name', event.target.value)} placeholder="e.g. Burn time" className="flex-1" /><Input aria-label={`Field ${index + 1} unit`} value={field.measurement ?? ''} onChange={(event) => updateField(index, 'measurement', event.target.value)} placeholder="Unit, e.g. hours" className="w-40" /><Button type="button" variant="ghost" size="icon" aria-label={`Remove field ${index + 1}`} onClick={() => removeField(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div><Button type="button" variant="link" className="mt-2 px-0" onClick={() => setFields((current) => [...current, emptyField()])}>+ Add field</Button></fieldset>
                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4"><Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size={5} /> : editingId ? 'Save changes' : 'Create template'}</Button></div>
                    </form>
                </CardContent></Card>
            )}

            {!loading && !loadError && <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input aria-label="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Search template or field name…" /></div>}

            {!loading && !loadError && <section aria-labelledby="custom-templates-heading"><div className="mb-2 flex items-center justify-between"><h2 id="custom-templates-heading" className="font-semibold text-white">Your custom templates</h2><span className="text-xs text-slate-500">{customTemplates.length} shown</span></div>{customTemplates.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{customTemplates.map((template) => <TemplateCard key={template.id} template={template} onEdit={startEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}</div> : <Card><CardContent className="p-6 text-center text-sm text-slate-500">{query ? 'No custom templates match your search.' : 'Duplicate a system template or create one from scratch.'}</CardContent></Card>}</section>}

            {!loading && !loadError && <section aria-labelledby="system-templates-heading"><div className="mb-2 flex items-center justify-between"><h2 id="system-templates-heading" className="font-semibold text-white">Built-in templates</h2><span className="text-xs text-slate-500">Managed by OmniStock · {systemTemplates.length} shown</span></div>{systemTemplates.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{systemTemplates.map((template) => <TemplateCard key={template.id} template={template} duplicating={duplicatingId === template.id} onEdit={startEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}</div> : <Card><CardContent className="p-6 text-center text-sm text-slate-500">No system templates match your search.</CardContent></Card>}</section>}
        </div>
    );
}
