'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail } from 'lucide-react';
import { Alert, Button, Spinner } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAuthIdentity } from '../queries';
import { useSendVerificationEmail } from '../security-queries';
import { AuthShell } from './AuthShell';

export const VerifyEmailView = () => {
    const justSent = useSearchParams().get('sent') === '1';
    const { user, isPending } = useAuthIdentity();
    const sendVerification = useSendVerificationEmail();

    if (isPending) {
        return (
            <AuthShell title="Verify your email" subtitle="Vendor Portal Access">
                <Spinner size={6} />
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Verify your email"
            subtitle="Vendor Portal Access"
            description="Verification protects invitations, password recovery, and account ownership."
            footer={
                <Link
                    href={user ? '/dashboard' : '/login'}
                    className="text-indigo-400 hover:text-indigo-300"
                >
                    {user ? 'Continue to dashboard' : 'Return to sign in'}
                </Link>
            }
        >
            {user?.emailVerified ? (
                <Alert variant="success">
                    <CheckCircle2 className="mb-2 h-5 w-5" /> Your email address is verified.
                </Alert>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                        <Mail className="mb-2 h-5 w-5 text-indigo-400" />
                        {user
                            ? `Send a new link to ${user.email}.`
                            : 'Sign in to request another verification link.'}
                    </div>
                    {(sendVerification.isSuccess || justSent) && (
                        <Alert variant="success">
                            Verification email sent. Check your inbox.
                        </Alert>
                    )}
                    {sendVerification.error && (
                        <Alert variant="danger">{getErrorMessage(sendVerification.error)}</Alert>
                    )}
                    {user && (
                        <Button
                            className="w-full"
                            disabled={sendVerification.isPending}
                            onClick={() => sendVerification.mutate(user.email)}
                        >
                            {sendVerification.isPending && <Spinner size={4} className="mr-2" />}
                            Resend verification email
                        </Button>
                    )}
                </div>
            )}
        </AuthShell>
    );
};
