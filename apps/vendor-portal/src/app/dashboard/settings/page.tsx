'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building, Globe2, Mail, Save, Trash2 } from 'lucide-react';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Spinner,
} from '@inventory-system/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import SecuritySettings from '@/components/SecuritySettings';

export default function SettingsPage() {
    const { user, platform, refreshProfile, logout } = useAuth();
    const router = useRouter();
    const profile = platform?.vendorProfile;
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [description, setDescription] = useState(profile?.description || '');
    const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setDisplayName(profile?.displayName || '');
        setDescription(profile?.description || '');
        setWebsiteUrl(profile?.websiteUrl || '');
    }, [profile]);

    const handleUpdate = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await api.updateVendorProfile({
                displayName,
                description: description || null,
                websiteUrl: websiteUrl || null,
            });
            await refreshProfile();
            setMessage('Vendor Profile updated successfully.');
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to update Vendor Profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmName = prompt(`Type "${profile?.displayName}" to deactivate this account.`);
        if (confirmName !== profile?.displayName) return;
        try {
            await api.deleteAccount();
            await logout();
            router.replace('/login');
        } catch {
            setError('Failed to deactivate the account.');
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Manage your producer identity, account security, and signed-in devices.
                </p>
            </div>

            {!user?.emailVerified && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                    <span>Verify {user?.email} to secure recovery and invitations.</span>
                    <Link
                        href="/verify-email"
                        className="font-semibold text-amber-200 underline underline-offset-4"
                    >
                        Verify email
                    </Link>
                </div>
            )}
            {message && (
                <div
                    role="status"
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                >
                    {message}
                </div>
            )}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"
                >
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Vendor Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-5">
                        <div>
                            <Label htmlFor="profile-name">Display name</Label>
                            <div className="relative mt-1.5">
                                <Building className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                <Input
                                    id="profile-name"
                                    className="pl-10"
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    required
                                    maxLength={200}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="account-email">Account email</Label>
                            <div className="relative mt-1.5">
                                <Mail className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                <Input
                                    id="account-email"
                                    className="pl-10"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">
                                Account email changes are intentionally unavailable in this release.
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="profile-description">Description</Label>
                            <textarea
                                id="profile-description"
                                className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                maxLength={5000}
                            />
                        </div>
                        <div>
                            <Label htmlFor="profile-website">Website</Label>
                            <div className="relative mt-1.5">
                                <Globe2 className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                <Input
                                    id="profile-website"
                                    className="pl-10"
                                    type="url"
                                    value={websiteUrl}
                                    onChange={(event) => setWebsiteUrl(event.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <Spinner size={4} className="mr-2" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}{' '}
                            Save profile
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <SecuritySettings />

            <Card className="border-rose-900/50 bg-rose-950/20">
                <CardHeader>
                    <CardTitle className="text-rose-500">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm leading-6 text-slate-400">
                        Deactivate the owner account and immediately end its sessions. Catalog data
                        remains retained according to the documented lifecycle.
                    </p>
                    <Button onClick={handleDeleteAccount} variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Deactivate account
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
