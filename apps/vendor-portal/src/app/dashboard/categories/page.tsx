'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, FolderTree, Edit, Trash2, ShieldAlert } from 'lucide-react';
import {
    Button,
    Input,
    Label,
    Spinner,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@inventory-system/ui';

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
                <Spinner size={8} />
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
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex items-end gap-4">
                            <div className="flex-1 space-y-1.5">
                                <Label>Name</Label>
                                <Input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Category Name"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <Label>Parent Category (Optional)</Label>
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Spinner size={5} /> : 'Save'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 p-4">
                        <FolderTree className="h-5 w-5 text-indigo-400" />
                        <h2 className="font-semibold text-white">Your Categories</h2>
                    </div>
                    <CardContent className="divide-y divide-slate-800 p-0">
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(c.id)}
                                            className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden opacity-80">
                    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 p-4">
                        <ShieldAlert className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-300">System Categories</h2>
                    </div>
                    <CardContent className="h-96 divide-y divide-slate-800 overflow-y-auto p-0">
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
                                <Badge variant="outline">System</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
