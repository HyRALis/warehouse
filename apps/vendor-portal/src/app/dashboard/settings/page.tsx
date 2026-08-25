'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Save, Trash2, Building, Mail } from 'lucide-react';
import {
    Button,
    Input,
    Label,
    Spinner,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@inventory-system/ui';

export default function SettingsPage() {
    const { vendor, refreshProfile, logout } = useAuth();
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
            `Type "${vendor?.companyName}" to deactivate this vendor account.`
        );
        if (confirmName === vendor?.companyName) {
            try {
                await api.deleteAccount();
                await logout();
            } catch (err) {
                alert('Failed to deactivate account');
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

            <Card>
                <CardHeader>
                    <CardTitle>Vendor Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-5">
                        <div>
                            <Label>Company Name</Label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Building className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Email Address</Label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <Spinner size={4} className="mr-2" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-rose-900/50 bg-rose-950/20">
                <CardHeader>
                    <CardTitle className="text-rose-500">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-slate-400">
                        Deactivate this vendor account and immediately end its sessions. Catalog
                        data is retained until the documented retention and purge process runs.
                    </p>
                    <Button onClick={handleDeleteAccount} variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Deactivate Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
