'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail } from 'lucide-react';
import type { PublicInvitationSummary } from '@inventory-system/contracts';
import { Alert, Button, Spinner } from '@inventory-system/ui';
import { AuthShell, useAuthIdentity } from '@/features/auth';
import { getErrorMessage } from '@/lib/api/client';
import { useAcceptInvitation, useInvitationSummary } from '../hooks';
import { invitationUnavailableReason, isInvitedAccount } from '../utils/invitation';
import { InvitedSignUpForm } from './InvitedSignUpForm';

const Shell = ({ children }: { children: React.ReactNode }) => (
    <AuthShell
        title="Join an organization"
        subtitle="Vendor Portal Access"
        description="Accept the invitation to become a Member. Vendor Portal access is granted separately by an Owner."
    >
        {children}
    </AuthShell>
);

const AcceptedNotice = () => {
    const router = useRouter();
    return (
        <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-4 font-medium text-white">Invitation accepted</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
                Your membership is active. If Vendor Portal access has already been granted, you can
                enter now.
            </p>
            <Button className="mt-5 w-full" onClick={() => router.replace('/dashboard')}>
                Continue
            </Button>
        </div>
    );
};

const InvitationActions = ({
    invitation,
    invitationId,
}: {
    invitation: PublicInvitationSummary;
    invitationId: string;
}) => {
    const { user } = useAuthIdentity();
    const accept = useAcceptInvitation();
    const acceptInvitation = () =>
        accept.mutate({ invitationId, organizationId: invitation.organizationId });

    if (accept.isSuccess) return <AcceptedNotice />;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <Mail className="mb-2 h-5 w-5 text-indigo-400" />
                <p className="font-medium text-white">{invitation.organizationName}</p>
                <p className="mt-1 text-sm text-slate-400">Invited {invitation.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                    Expires {new Date(invitation.expiresAt).toLocaleString()}
                </p>
            </div>
            {accept.error && <Alert variant="danger">{getErrorMessage(accept.error)}</Alert>}
            {!user && (
                <InvitedSignUpForm
                    invitation={invitation}
                    invitationId={invitationId}
                    onSignedUp={acceptInvitation}
                />
            )}
            {user && !isInvitedAccount(invitation.email, user.email) && (
                <Alert variant="warning">
                    This invitation belongs to {invitation.email}, but you are signed in as{' '}
                    {user.email}. Sign out and use the invited account.
                </Alert>
            )}
            {user && isInvitedAccount(invitation.email, user.email) && (
                <Button className="w-full" disabled={accept.isPending} onClick={acceptInvitation}>
                    {accept.isPending && <Spinner size={4} className="mr-2" />} Accept invitation
                </Button>
            )}
        </div>
    );
};

export const AcceptInvitationView = () => {
    const invitationId = useSearchParams().get('invitationId') || '';
    const summary = useInvitationSummary(invitationId);

    const blockingReason = (): string | null => {
        if (!invitationId) return 'This invitation link is missing its identifier.';
        if (summary.error) {
            return getErrorMessage(
                summary.error,
                'This invitation is invalid or no longer available.'
            );
        }
        return summary.data ? invitationUnavailableReason(summary.data) : null;
    };

    if (invitationId && summary.isPending) {
        return (
            <Shell>
                <div className="flex justify-center py-8">
                    <Spinner size={6} />
                </div>
            </Shell>
        );
    }

    const blocking = blockingReason();
    if (blocking || !summary.data) {
        return (
            <Shell>
                <Alert variant="danger">
                    {blocking ?? 'This invitation is invalid or no longer available.'}
                </Alert>
                <p className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                        Return to sign in
                    </Link>
                </p>
            </Shell>
        );
    }

    return (
        <Shell>
            <InvitationActions invitation={summary.data} invitationId={invitationId} />
        </Shell>
    );
};
