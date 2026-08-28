'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Edit3, FolderTree, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input, Label, Spinner } from '@inventory-system/ui';

interface TemplateSummary { id: string; name: string }
interface Category {
    id: string;
    code?: string | null;
    name: string;
    aliases?: string[];
    parentId?: string | null;
    defaultTemplateId?: string | null;
    vendorId?: string | null;
    parent?: { id: string; name: string } | null;
    defaultTemplate?: TemplateSummary | null;
    _count?: { products: number; children: number };
}

const emptyForm = { name: '', aliases: '', parentId: '', defaultTemplateId: '' };

function CategoryRow({ category, editable, onEdit, onDelete }: {
    category: Category;
    editable: boolean;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
}) {
    const productCount = category._count?.products ?? 0;
    const childCount = category._count?.children ?? 0;
    return (
        <div className="flex flex-col gap-3 border-b border-slate-800/80 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">{category.parent ? `${category.parent.name} / ` : ''}{category.name}</span>
                    <Badge variant="outline">{editable ? 'Custom' : 'System'}</Badge>
                    {category.code && <span className="font-mono text-xs text-slate-600">{category.code}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{productCount} {productCount === 1 ? 'product' : 'products'}</span>
                    <span>{childCount} {childCount === 1 ? 'subcategory' : 'subcategories'}</span>
                    <span>Default: {category.defaultTemplate?.name ?? 'Generic product'}</span>
                </div>
                {!!category.aliases?.length && <p className="mt-1 truncate text-xs text-slate-600">Also matches: {category.aliases.join(', ')}</p>}
            </div>
            {editable ? (
                <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${category.name}`} onClick={() => onEdit(category)}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category)} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></Button>
                </div>
            ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-600"><ShieldCheck className="h-4 w-4" /> Read only</span>
            )}
        </div>
    );
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCatalog = useCallback(async () => {
        setError('');
        try {
            const [categoryResponse, templateResponse] = await Promise.all([api.getCategories(), api.getTemplates()]);
            setCategories(categoryResponse.data || []);
            setTemplates(templateResponse.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchCatalog();
        if (new URLSearchParams(window.location.search).get('create') === 'true') setShowForm(true);
    }, [fetchCatalog]);

    const startCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setShowForm(true); };
    const startEdit = (category: Category) => {
        setEditingId(category.id);
        setForm({ name: category.name, aliases: category.aliases?.join(', ') ?? '', parentId: category.parentId ?? '', defaultTemplateId: category.defaultTemplateId ?? '' });
        setError('');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');
        const payload = {
            name: form.name.trim(),
            aliases: form.aliases.split(',').map((alias) => alias.trim()).filter(Boolean),
            parentId: form.parentId || null,
            defaultTemplateId: form.defaultTemplateId || null,
        };
        try {
            if (editingId) await api.updateCategory(editingId, payload); else await api.createCategory(payload);
            closeForm();
            await fetchCatalog();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if (!window.confirm(`Delete “${category.name}”?`)) return;
        setError('');
        try {
            await api.deleteCategory(category.id);
            await fetchCatalog();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not delete category');
        }
    };

    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        if (!needle) return categories;
        return categories.filter((category) => [category.name, category.code, category.parent?.name, ...(category.aliases ?? [])].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(needle)));
    }, [categories, query]);
    const customCategories = filtered.filter((category) => category.vendorId);
    const systemCategories = filtered.filter((category) => !category.vendorId);
    const parentOptions = categories.filter((category) => category.id !== editingId);

    if (loading) return <div className="flex justify-center p-20"><Spinner size={8} /></div>;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-400"><FolderTree className="h-4 w-4" /> Advanced setup</div>
                    <h1 className="text-2xl font-bold text-white">Categories</h1>
                    <p className="mt-1 text-sm text-slate-400">Use the built-in catalog immediately. Add a custom category only when your product needs one.</p>
                </div>
                <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add custom category</Button>
            </header>

            {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

            {showForm && (
                <Card><CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-white">{editingId ? 'Edit custom category' : 'New custom category'}</h2><Button variant="ghost" size="icon" aria-label="Close category form" onClick={closeForm}><X className="h-4 w-4" /></Button></div>
                    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5"><Label htmlFor="category-name">Name</Label><Input id="category-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Handmade candles" /></div>
                        <div className="space-y-1.5"><Label htmlFor="category-aliases">Search aliases</Label><Input id="category-aliases" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="candles, home fragrance" /></div>
                        <div className="space-y-1.5"><Label htmlFor="category-parent">Parent category</Label><select id="category-parent" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 focus:ring-2 focus:ring-indigo-500"><option value="">Top level</option>{parentOptions.map((category) => <option key={category.id} value={category.id}>{category.parent ? `${category.parent.name} / ` : ''}{category.name}</option>)}</select></div>
                        <div className="space-y-1.5"><Label htmlFor="category-template">Default field template</Label><select id="category-template" value={form.defaultTemplateId} onChange={(e) => setForm({ ...form, defaultTemplateId: e.target.value })} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 focus:ring-2 focus:ring-indigo-500"><option value="">Generic product</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
                        <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size={5} /> : editingId ? 'Save changes' : 'Create category'}</Button></div>
                    </form>
                </CardContent></Card>
            )}

            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input aria-label="Search categories" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" placeholder="Search name, code, alias, or parent…" /></div>

            <section aria-labelledby="custom-categories-heading">
                <div className="mb-2 flex items-center justify-between"><h2 id="custom-categories-heading" className="font-semibold text-white">Your custom categories</h2><span className="text-xs text-slate-500">{customCategories.length} shown</span></div>
                <Card><CardContent className="p-0">{customCategories.length ? customCategories.map((category) => <CategoryRow key={category.id} category={category} editable onEdit={startEdit} onDelete={handleDelete} />) : <p className="p-6 text-center text-sm text-slate-500">{query ? 'No custom categories match your search.' : 'You do not need to create a category before adding a product.'}</p>}</CardContent></Card>
            </section>

            <section aria-labelledby="system-categories-heading">
                <div className="mb-2 flex items-center justify-between"><h2 id="system-categories-heading" className="font-semibold text-white">Built-in catalog</h2><span className="text-xs text-slate-500">Managed by OmniStock · {systemCategories.length} shown</span></div>
                <Card><CardContent className="max-h-[34rem] overflow-y-auto p-0">{systemCategories.length ? systemCategories.map((category) => <CategoryRow key={category.id} category={category} editable={false} onEdit={startEdit} onDelete={handleDelete} />) : <p className="p-6 text-center text-sm text-slate-500">No system categories match your search.</p>}</CardContent></Card>
            </section>
        </div>
    );
}
