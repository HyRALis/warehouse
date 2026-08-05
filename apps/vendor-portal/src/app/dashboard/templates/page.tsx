'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2, Plus, FileText, Trash2, ChevronDown } from 'lucide-react';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [fields, setFields] = useState([{ name: '', measurement: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTemplates = async () => {
        try {
            const res = await api.getTemplates();
            if (res.success) setTemplates(res.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const validFields = fields.filter((f) => f.name.trim() !== '');
            const res = await api.createTemplate({ name, fields: validFields });
            if (res.success) {
                setShowForm(false);
                setName('');
                setFields([{ name: '', measurement: '' }]);
                fetchTemplates();
            }
        } catch (err) {
            alert('Error creating template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        try {
            const res = await api.deleteTemplate(id);
            if (res.success) fetchTemplates();
        } catch (err) {
            alert('Error deleting template');
        }
    };

    if (loading)
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Characteristic Templates</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Create reusable sets of characteristics for faster product entry
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4" /> Create Template
                </button>
            </div>

            {showForm && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                    <h3 className="mb-4 text-lg font-medium text-white">New Template</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-300">Template Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-100"
                                placeholder="e.g. Laptops"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-slate-300">Fields</label>
                            {fields.map((field, idx) => (
                                <div key={idx} className="mb-2 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Field Name (e.g. RAM)"
                                        value={field.name}
                                        onChange={(e) => {
                                            const newF = [...fields];
                                            newF[idx].name = e.target.value;
                                            setFields(newF);
                                        }}
                                        className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Unit (e.g. GB)"
                                        value={field.measurement}
                                        onChange={(e) => {
                                            const newF = [...fields];
                                            newF[idx].measurement = e.target.value;
                                            setFields(newF);
                                        }}
                                        className="w-32 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFields(fields.filter((_, i) => i !== idx))
                                        }
                                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setFields([...fields, { name: '', measurement: '' }])
                                }
                                className="mt-2 text-sm text-indigo-400"
                            >
                                + Add Field
                            </button>
                        </div>

                        <div className="flex justify-end border-t border-slate-800 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {templates.map((t) => (
                    <div
                        key={t.id}
                        className="group relative rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
                    >
                        <button
                            onClick={() => handleDelete(t.id)}
                            className="absolute right-4 top-4 rounded p-1.5 text-slate-500 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                                <FileText className="h-5 w-5" />
                            </div>
                            <h3 className="font-medium text-white">{t.name}</h3>
                        </div>
                        <div className="mb-3 text-sm text-slate-400">
                            {t.fields?.length || 0} fields defined
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {t.fields?.slice(0, 3).map((f: any, i: number) => (
                                <span
                                    key={i}
                                    className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300"
                                >
                                    {f.name}
                                </span>
                            ))}
                            {t.fields?.length > 3 && (
                                <span className="py-1 text-xs text-slate-500">
                                    +{t.fields.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {templates.length === 0 && !loading && (
                    <div className="col-span-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-12 text-center text-slate-500">
                        No templates created yet.
                    </div>
                )}
            </div>
        </div>
    );
}
