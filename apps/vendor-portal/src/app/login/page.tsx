'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Package2 } from 'lucide-react';
import Link from 'next/link';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';

const getSafeReturnTo = () => {
    if (typeof window === 'undefined') return '/dashboard';
    const value = new URLSearchParams(window.location.search).get('returnTo');
    return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, user, loading } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const result = await login(email, password);
            const returnTo = getSafeReturnTo();
            router.push(
                result.twoFactorRequired
                    ? `/two-factor?returnTo=${encodeURIComponent(returnTo)}`
                    : returnTo
            );
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!loading && user) router.replace(getSafeReturnTo());
    }, [loading, router, user]);

    if (!loading && user) return null;

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-4">
            {/* Decorative background blur */}
            <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
                        <Package2 className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">OmniStock</h1>
                    <p className="mt-1 text-slate-400">Vendor Portal Access</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl backdrop-blur-sm">
                    <h2 className="mb-6 text-xl font-semibold text-white">Sign In</h2>

                    <div className="mb-6 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs leading-5 text-indigo-200">
                        Existing accounts were moved to secure sessions. Sign in again with your
                        current password; no password reset is required.
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="login-email">Email Address</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    placeholder="vendor@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="login-password">Password</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Spinner size={5} className="mr-2" /> : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        <Link
                            href="/forgot-password"
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            Forgot your password?
                        </Link>
                    </div>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Don{"'"}t have an account?{' '}
                        <Link
                            href="/register"
                            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Apply now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
