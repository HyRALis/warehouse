'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail } from 'lucide-react';
import { Button, Spinner } from '@inventory-system/ui';
import AuthShell from '@/components/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { authClient } from '@/lib/auth-client';

function VerifyEmailContent() {
    const params = useSearchParams();
    const { user, refresh } = useAuth();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(
        params.get('sent') === '1' ? 'Verification email sent. Check your inbox.' : ''
    );
    const [error, setError] = useState('');

    return (
        <AuthShell
            title="Verify your email"
            subtitle="Verification protects invitations, password recovery, and account ownership."
        >
            {user?.emailVerified ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                    <CheckCircle2 className="mb-2 h-5 w-5" /> Your email address is verified.
                </div>
            ) : (
                <>
                    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                        <Mail className="mb-2 h-5 w-5 text-indigo-400" />
                        {user
                            ? `Send a new link to ${user.email}.`
                            : 'Sign in to request another verification link.'}
                    </div>
                    {message && (
                        <p role="status" className="mt-4 text-sm text-emerald-300">
                            {message}
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="mt-4 text-sm text-rose-300">
                            {error}
                        </p>
                    )}
                    {user && (
                        <Button
                            className="mt-5 w-full"
                            disabled={sending}
                            onClick={async () => {
                                setSending(true);
                                setError('');
                                const result = await authClient.sendVerificationEmail({
                                    email: user.email,
                                    callbackURL: '/dashboard/settings?verified=1',
                                });
                                if (result.error)
                                    setError(
                                        result.error.message || 'Unable to send verification email.'
                                    );
                                else setMessage('Verification email sent. Check your inbox.');
                                setSending(false);
                            }}
                        >
                            {sending && <Spinner size={4} className="mr-2" />} Resend verification
                            email
                        </Button>
                    )}
                </>
            )}
            <p className="mt-6 text-center text-sm">
                <Link
                    href={user ? '/dashboard' : '/login'}
                    className="text-indigo-400 hover:text-indigo-300"
                >
                    {user ? 'Continue to dashboard' : 'Return to sign in'}
                </Link>
            </p>
        </AuthShell>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    );
}
