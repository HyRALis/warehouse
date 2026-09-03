'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Package2, Building } from 'lucide-react';
import Link from 'next/link';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await register(email, password, companyName);
            router.push('/verify-email?sent=1');
        } catch (err: any) {
            setError(err.message || 'An error occurred during registration');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-4">
            <div className="pointer-events-none absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
                        <Package2 className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">OmniStock</h1>
                    <p className="mt-1 text-slate-400">Create your vendor workspace</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl backdrop-blur-sm">
                    <h2 className="mb-6 text-xl font-semibold text-white">Create Account</h2>

                    <p className="mb-6 text-sm leading-6 text-slate-400">
                        This creates your organization, activates its Vendor Portal access, and
                        prepares a primary producer profile in one step.
                    </p>

                    {error && (
                        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="register-company">Company Name</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Building className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    id="register-company"
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="pl-10"
                                    placeholder="Acme Corp"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="register-email">Email Address</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    id="register-email"
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
                            <Label htmlFor="register-password">Password</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <Input
                                    id="register-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10"
                                    placeholder="••••••••"
                                    required
                                    minLength={12}
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                            {isSubmitting ? (
                                <Spinner size={5} className="mr-2" />
                            ) : (
                                'Create Account'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
