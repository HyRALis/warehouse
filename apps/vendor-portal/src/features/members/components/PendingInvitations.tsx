'use client';

import { RefreshCw, XCircle } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useCancelInvitation, useInvitations, useInviteMember } from '../hooks';

const InvitationRows = ({ organizationId }: { organizationId: string }) => {
    const invitations = useInvitations(organizationId);
    const resend = useInviteMember(organizationId);
    const cancel = useCancelInvitation(organizationId);
    const busy = resend.isPending || cancel.isPending;
    const error = invitations.error || resend.error || cancel.error;

    if (invitations.isPending) return <Spinner size={5} />;

    return (
        <>
            {error && (
                <Alert variant="danger" className="mb-4">
                    {getErrorMessage(error)}
                </Alert>
            )}
            {!invitations.data?.length ? (
                <p className="text-sm text-slate-400">No pending invitations.</p>
            ) : (
                <div className="divide-y divide-slate-800">
                    {invitations.data.map((invitation) => (
                        <div
                            key={invitation.id}
                            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {invitation.email}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Expires {new Date(invitation.expiresAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                        resend.mutate({ email: invitation.email, resend: true })
                                    }
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Resend
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => cancel.mutate(invitation.id)}
                                >
                                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export const PendingInvitations = ({ organizationId }: { organizationId: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent>
            <InvitationRows organizationId={organizationId} />
        </CardContent>
    </Card>
);
