'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';
import AuthShell from '@/components/AuthShell';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/context/AuthContext';

export default function TwoFactorPage() {
    const [mode, setMode] = useState<'totp' | 'backup'>('totp');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { refresh } = useAuth();

    return (
        <AuthShell
            title="Two-factor verification"
            subtitle="Enter an authenticator code or one unused recovery code to finish signing in."
        >
            <form
                className="space-y-5"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setSubmitting(true);
                    setError('');
                    const result =
                        mode === 'totp'
                            ? await authClient.twoFactor.verifyTotp({
                                  code: code.replace(/\s/g, ''),
                                  trustDevice: true,
                              })
                            : await authClient.twoFactor.verifyBackupCode({
                                  code: code.trim(),
                                  trustDevice: true,
                              });
                    if (result.error) {
                        setError(result.error.message || 'The verification code is invalid.');
                        setSubmitting(false);
                        return;
                    }
                    await refresh();
                    const value = new URLSearchParams(window.location.search).get('returnTo');
                    const returnTo =
                        value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
                    router.replace(returnTo);
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
                    <Label htmlFor="two-factor-code">
                        {mode === 'totp' ? 'Authenticator code' : 'Recovery code'}
                    </Label>
                    <div className="relative mt-1.5">
                        <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                        <Input
                            id="two-factor-code"
                            className="pl-10 font-mono tracking-widest"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            autoComplete="one-time-code"
                            required
                            autoFocus
                        />
                    </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !code.trim()}>
                    {submitting ? (
                        <Spinner size={4} className="mr-2" />
                    ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                    )}{' '}
                    Verify and continue
                </Button>
            </form>
            <button
                type="button"
                className="mt-5 w-full text-center text-sm text-indigo-400 hover:text-indigo-300"
                onClick={() => {
                    setMode(mode === 'totp' ? 'backup' : 'totp');
                    setCode('');
                    setError('');
                }}
            >
                {mode === 'totp' ? 'Use a recovery code' : 'Use an authenticator code'}
            </button>
            <p className="mt-4 text-center text-sm">
                <Link href="/login" className="text-slate-400 hover:text-slate-300">
                    Cancel and return to sign in
                </Link>
            </p>
        </AuthShell>
    );
}
