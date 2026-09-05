'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Alert, Button, Input, Label, Spinner } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useVerifyTwoFactor } from '../security-queries';
import { AuthShell } from './AuthShell';

export const TwoFactorForm = () => {
    const [mode, setMode] = useState<'totp' | 'backup'>('totp');
    const [code, setCode] = useState('');
    const verify = useVerifyTwoFactor(useSearchParams().get('returnTo'));

    const switchMode = () => {
        setMode(mode === 'totp' ? 'backup' : 'totp');
        setCode('');
        verify.reset();
    };

    return (
        <AuthShell
            title="Two-factor verification"
            subtitle="Vendor Portal Access"
            description="Enter an authenticator code or one unused recovery code to finish signing in."
            footer={
                <Link href="/login" className="text-slate-400 hover:text-slate-300">
                    Cancel and return to sign in
                </Link>
            }
        >
            <form
                className="space-y-5"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    verify.mutate({ code, mode });
                }}
            >
                {verify.error && <Alert variant="danger">{getErrorMessage(verify.error)}</Alert>}
                <div className="space-y-1.5">
                    <Label htmlFor="two-factor-code">
                        {mode === 'totp' ? 'Authenticator code' : 'Recovery code'}
                    </Label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <Input
                            id="two-factor-code"
                            className="pl-10 font-mono tracking-widest"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            autoComplete="one-time-code"
                            required
                        />
                    </div>
                </div>
                <Button
                    type="submit"
                    className="w-full"
                    disabled={verify.isPending || !code.trim()}
                >
                    {verify.isPending ? (
                        <Spinner size={4} className="mr-2" />
                    ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Verify and continue
                </Button>
            </form>
            <Button variant="ghost" className="mt-5 w-full" onClick={switchMode}>
                {mode === 'totp' ? 'Use a recovery code' : 'Use an authenticator code'}
            </Button>
        </AuthShell>
    );
};
