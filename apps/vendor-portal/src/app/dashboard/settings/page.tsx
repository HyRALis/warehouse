'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Loader2, Save, Trash2, Building, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { vendor, refreshProfile, logout } = useAuth();
    const router = useRouter();

    const [companyName, setCompanyName] = useState(vendor?.companyName || '');
    const [email, setEmail] = useState(vendor?.email || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const res = await api.updateProfile({ companyName, email });
            if (res.success) {
                setMessage('Profile updated successfully');
                refreshProfile();
            } else {
                setMessage(res.message || 'Failed to update profile');
            }
        } catch (err: any) {
            setMessage(err.message || 'Error updating profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmName = prompt(
            `Type "${vendor?.companyName}" to confirm account deletion. This will delete all products and categories.`
        );
        if (confirmName === vendor?.companyName) {
            try {
                await api.deleteAccount();
                logout();
                router.push('/login');
            } catch (err) {
                alert('Failed to delete account');
            }
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Manage your vendor profile and preferences
                </p>
            </div>

            {message && (
                <div
                    className={`rounded-lg border p-4 ${message.includes('success') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}
                >
                    {message}
                </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-6 text-lg font-semibold text-white">Vendor Profile</h2>
                <form onSubmit={handleUpdate} className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-slate-300">Company Name</label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Building className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300">Email Address</label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Mail className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-slate-100 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save Changes
                    </button>
                </form>
            </div>

            <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-6">
                <h2 className="mb-2 text-lg font-semibold text-rose-500">Danger Zone</h2>
                <p className="mb-4 text-sm text-slate-400">
                    Permanently delete your account and all associated data, including products,
                    categories, and templates.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-600/10 px-4 py-2 font-medium text-rose-500 transition-colors hover:bg-rose-500 hover:text-white"
                >
                    <Trash2 className="h-4 w-4" /> Delete Account
                </button>
            </div>
        </div>
    );
}
