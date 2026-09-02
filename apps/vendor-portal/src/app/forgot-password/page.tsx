'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';
import AuthShell from '@/components/AuthShell';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    return (
        <AuthShell
            title="Reset your password"
            subtitle="We will send a secure reset link if the address belongs to an account."
        >
            {message ? (
                <div
                    role="status"
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                >
                    {message}
                </div>
            ) : (
                <form
                    className="space-y-5"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        setSubmitting(true);
                        try {
                            const response = await api.forgotPassword({ email });
                            setMessage(
                                response.message ||
                                    'If the email exists, a reset link has been sent.'
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    <div>
                        <Label htmlFor="reset-email">Email address</Label>
                        <div className="relative mt-1.5">
                            <Mail className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                            <Input
                                id="reset-email"
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="pl-10"
                                autoComplete="email"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Spinner size={4} className="mr-2" />} Send reset link
                    </Button>
                </form>
            )}
            <p className="mt-6 text-center text-sm text-slate-400">
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                    Back to sign in
                </Link>
            </p>
        </AuthShell>
    );
}
