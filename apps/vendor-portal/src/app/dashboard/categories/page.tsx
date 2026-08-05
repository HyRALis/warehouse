'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, FolderTree, Edit, Trash2, ShieldAlert } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    parentId?: string;
    vendorId?: string;
    parent?: Category;
}

export default function CategoriesPage() {
    const { vendor } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [formName, setFormName] = useState('');
    const [formParentId, setFormParentId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCategories = async () => {
        try {
            const res = await api.getCategories();
            if (res.success) {
                setCategories(res.data || []);
            }
        } catch (err: any) {
            setError('Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.createCategory({
                name: formName,
                parentId: formParentId || undefined,
            });
            if (res.success) {
                setFormName('');
                setFormParentId('');
                setShowForm(false);
                fetchCategories();
            } else {
                alert(res.message);
            }
        } catch (err: any) {
            alert('Error creating category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            const res = await api.deleteCategory(id);
            if (res.success) {
                fetchCategories();
            } else {
                alert(res.message || 'Cannot delete category (it may have products linked).');
            }
        } catch (err) {
            alert('Error deleting category.');
        }
    };

    const systemCategories = categories.filter((c) => !c.vendorId);
    const vendorCategories = categories.filter((c) => c.vendorId === vendor?.id);

    if (loading)
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Categories</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Organize your products with categories
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4" /> Add Category
                </button>
            </div>

            {showForm && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                    <h3 className="mb-4 text-lg font-medium text-white">Create New Category</h3>
                    <form onSubmit={handleSubmit} className="flex items-end gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-sm text-slate-300">Name</label>
                            <input
                                type="text"
                                required
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Category Name"
                            />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-sm text-slate-300">
                                Parent Category (Optional)
                            </label>
                            <select
                                value={formParentId}
                                onChange={(e) => setFormParentId(e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">None (Top Level)</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 p-4">
                        <FolderTree className="h-5 w-5 text-indigo-400" />
                        <h2 className="font-semibold text-white">Your Categories</h2>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {vendorCategories.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500">
                                No custom categories created yet.
                            </div>
                        ) : (
                            vendorCategories.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between p-4 hover:bg-slate-800/30"
                                >
                                    <div>
                                        <div className="font-medium text-slate-200">{c.name}</div>
                                        {c.parent && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                Subcategory of: {c.parent.name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="rounded-md p-2 text-rose-400 transition-colors hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 opacity-80">
                    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 p-4">
                        <ShieldAlert className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-300">System Categories</h2>
                    </div>
                    <div className="h-96 divide-y divide-slate-800 overflow-y-auto">
                        {systemCategories.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-4">
                                <div>
                                    <div className="font-medium text-slate-300">{c.name}</div>
                                    {c.parent && (
                                        <div className="mt-1 text-xs text-slate-500">
                                            Subcategory of: {c.parent.name}
                                        </div>
                                    )}
                                </div>
                                <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
                                    System
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
