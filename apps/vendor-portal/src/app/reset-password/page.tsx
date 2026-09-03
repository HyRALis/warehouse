'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';
import AuthShell from '@/components/AuthShell';
import { api } from '@/lib/api';

function ResetPasswordForm() {
    const params = useSearchParams();
    const token = params.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(token ? '' : 'This reset link is missing its token.');

    return (
        <AuthShell
            title="Choose a new password"
            subtitle="Use at least 12 characters and a password unique to this account."
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
                        setError('');
                        if (password !== confirmPassword) {
                            setError('The passwords do not match.');
                            return;
                        }
                        setSubmitting(true);
                        try {
                            const response = await api.resetPassword({ token, password });
                            setMessage(response.message || 'Password reset. You can now sign in.');
                        } catch (cause) {
                            setError(
                                cause instanceof Error ? cause.message : 'Unable to reset password.'
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"
                        >
                            {error}
                        </div>
                    )}
                    <div>
                        <Label htmlFor="new-password">New password</Label>
                        <Input
                            id="new-password"
                            className="mt-1.5"
                            type="password"
                            minLength={12}
                            maxLength={128}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    <div>
                        <Label htmlFor="confirm-password">Confirm password</Label>
                        <Input
                            id="confirm-password"
                            className="mt-1.5"
                            type="password"
                            minLength={12}
                            maxLength={128}
                            required
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={!token || submitting}>
                        {submitting && <Spinner size={4} className="mr-2" />} Reset password
                    </Button>
                </form>
            )}
            <p className="mt-6 text-center text-sm">
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                    Return to sign in
                </Link>
            </p>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}
