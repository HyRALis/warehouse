'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail, UserPlus } from 'lucide-react';
import { Button, Input, Label, Spinner } from '@inventory-system/ui';
import AuthShell from '@/components/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { authClient } from '@/lib/auth-client';
import { api, type PublicInvitationSummary } from '@/lib/api';

function AcceptInvitationContent() {
    const params = useSearchParams();
    const invitationId = params.get('invitationId') || '';
    const { user, refresh } = useAuth();
    const router = useRouter();
    const [invitation, setInvitation] = useState<PublicInvitationSummary | null>(null);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!invitationId) {
            setError('This invitation link is missing its identifier.');
            setLoading(false);
            return;
        }
        void (async () => {
            try {
                const result = await api.getInvitationSummary(invitationId);
                const nextInvitation = result.data;
                if (
                    nextInvitation.status !== 'pending' ||
                    new Date(nextInvitation.expiresAt) <= new Date()
                ) {
                    setError(
                        'This invitation has expired or has already been used. Ask an Owner to send a new one.'
                    );
                } else setInvitation(nextInvitation);
            } catch (invitationError) {
                setError(
                    invitationError instanceof Error
                        ? invitationError.message
                        : 'This invitation is invalid or no longer available.'
                );
            }
            setLoading(false);
        })();
    }, [invitationId]);

    const accept = async () => {
        if (!invitation) return;
        setWorking(true);
        setError('');
        const result = await authClient.organization.acceptInvitation({ invitationId });
        if (result.error) {
            setError(result.error.message || 'Unable to accept the invitation.');
            setWorking(false);
            return;
        }
        await authClient.organization.setActive({ organizationId: invitation.organizationId });
        await refresh();
        setAccepted(true);
        setWorking(false);
    };

    const returnQuery = encodeURIComponent(`/accept-invitation?invitationId=${invitationId}`);

    return (
        <AuthShell
            title="Join an organization"
            subtitle="Accept the invitation to become a Member. Vendor Portal access is granted separately by an Owner."
        >
            {loading ? (
                <div className="flex justify-center py-8">
                    <Spinner size={6} />
                </div>
            ) : accepted ? (
                <div className="text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <p className="mt-4 font-medium text-white">Invitation accepted</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        Your membership is active. If Vendor Portal access has already been granted,
                        you can enter now.
                    </p>
                    <Button className="mt-5 w-full" onClick={() => router.replace('/dashboard')}>
                        Continue
                    </Button>
                </div>
            ) : error && !invitation ? (
                <div>
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
                    >
                        {error}
                    </div>
                    <p className="mt-6 text-center text-sm">
                        <Link href="/login" className="text-indigo-400">
                            Return to sign in
                        </Link>
                    </p>
                </div>
            ) : invitation ? (
                <div className="space-y-5">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                        <Mail className="mb-2 h-5 w-5 text-indigo-400" />
                        <p className="font-medium text-white">{invitation.organizationName}</p>
                        <p className="mt-1 text-sm text-slate-400">Invited {invitation.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Expires {new Date(invitation.expiresAt).toLocaleString()}
                        </p>
                    </div>
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200"
                        >
                            {error}
                        </div>
                    )}
                    {user ? (
                        user.email.toLowerCase() !== invitation.email.toLowerCase() ? (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                                This invitation belongs to {invitation.email}, but you are signed in
                                as {user.email}. Sign out and use the invited account.
                            </div>
                        ) : (
                            <Button className="w-full" disabled={working} onClick={accept}>
                                {working && <Spinner size={4} className="mr-2" />} Accept invitation
                            </Button>
                        )
                    ) : (
                        <>
                            <form
                                className="space-y-4"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    setWorking(true);
                                    setError('');
                                    const result = await authClient.signUp.email({
                                        email: invitation.email,
                                        name,
                                        password,
                                    });
                                    if (result.error) {
                                        setError(
                                            result.error.message ||
                                                'Unable to create the invited account.'
                                        );
                                        setWorking(false);
                                        return;
                                    }
                                    await accept();
                                }}
                            >
                                <div>
                                    <Label htmlFor="invite-name">Your name</Label>
                                    <Input
                                        id="invite-name"
                                        className="mt-1.5"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        required
                                        autoComplete="name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="invite-password">Create a password</Label>
                                    <Input
                                        id="invite-password"
                                        className="mt-1.5"
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        required
                                        minLength={12}
                                        maxLength={128}
                                        autoComplete="new-password"
                                    />
                                </div>
                                <Button className="w-full" type="submit" disabled={working}>
                                    {working ? (
                                        <Spinner size={4} className="mr-2" />
                                    ) : (
                                        <UserPlus className="mr-2 h-4 w-4" />
                                    )}{' '}
                                    Create account and accept
                                </Button>
                            </form>
                            <p className="text-center text-sm text-slate-400">
                                Already have an account?{' '}
                                <Link
                                    href={`/login?returnTo=${returnQuery}`}
                                    className="text-indigo-400 hover:text-indigo-300"
                                >
                                    Sign in first
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            ) : null}
        </AuthShell>
    );
}

export default function AcceptInvitationPage() {
    return (
        <Suspense>
            <AcceptInvitationContent />
        </Suspense>
    );
}
