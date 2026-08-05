'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Loader2, Package2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await api.login({ email, password });
            if (res.success && res.data) {
                login(res.data);
                router.push('/dashboard');
            } else {
                setError(res.message || 'Login failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setIsSubmitting(false);
        }
    };

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

                    {error && (
                        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                    placeholder="vendor@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Password</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

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
