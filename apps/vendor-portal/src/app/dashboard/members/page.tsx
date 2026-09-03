'use client';

import { useCallback, useEffect, useState } from 'react';
import { MailPlus, RefreshCw, ShieldCheck, UserRound, UserX, XCircle } from 'lucide-react';
import type { VendorMemberAccessResponse } from '@inventory-system/shared-types';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Spinner,
} from '@inventory-system/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

interface PendingInvitation {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date | string;
}

export default function MembersPage() {
    const { platform } = useAuth();
    const [members, setMembers] = useState<VendorMemberAccessResponse[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [workingId, setWorkingId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const organizationId = platform?.organization.id;
    const owner = platform?.membership.isOwner === true;

    const load = useCallback(async () => {
        if (!organizationId || !owner) return;
        setLoading(true);
        setError('');
        try {
            const [memberResult, invitationResult] = await Promise.all([
                api.getVendorMembers(),
                authClient.organization.listInvitations({ query: { organizationId } }),
            ]);
            setMembers(memberResult.data);
            if (invitationResult.error) throw new Error(invitationResult.error.message);
            setInvitations(
                ((invitationResult.data ?? []) as PendingInvitation[]).filter(
                    (invitation) => invitation.status === 'pending'
                )
            );
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to load team access.');
        } finally {
            setLoading(false);
        }
    }, [organizationId, owner]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!owner) {
        return (
            <div className="mx-auto max-w-2xl rounded-xl border border-rose-500/20 bg-rose-500/10 p-6">
                <h1 className="font-semibold text-white">Owner access required</h1>
                <p className="mt-2 text-sm text-rose-200">
                    Only Organization Owners can manage invitations and Vendor Portal access.
                </p>
            </div>
        );
    }

    const invite = async (resend = false, invitationEmail = email) => {
        if (!organizationId) return;
        setWorkingId(`invite:${invitationEmail}`);
        setError('');
        setMessage('');
        const result = await authClient.organization.inviteMember({
            email: invitationEmail.trim().toLowerCase(),
            role: 'member',
            organizationId,
            resend,
        });
        if (result.error) setError(result.error.message || 'Unable to send invitation.');
        else {
            setMessage(
                resend
                    ? `Invitation resent to ${invitationEmail}.`
                    : `Invitation sent to ${invitationEmail}.`
            );
            setEmail('');
            await load();
        }
        setWorkingId('');
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Team access</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Invite Organization members and choose who can enter the Vendor Portal.
                </p>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm leading-6 text-indigo-100">
                <ShieldCheck className="mr-2 inline h-4 w-4" /> Owners always have access while the
                Organization subscription is active. Member access can be granted or revoked here.
            </div>
            {message && (
                <div
                    role="status"
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                >
                    {message}
                </div>
            )}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"
                >
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Invite a member</CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            await invite();
                        }}
                    >
                        <div className="flex-1">
                            <Label htmlFor="invite-email">Email address</Label>
                            <Input
                                id="invite-email"
                                className="mt-1.5"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                placeholder="teammate@example.com"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={!email.trim() || workingId.startsWith('invite:')}
                        >
                            <MailPlus className="mr-2 h-4 w-4" /> Send invitation
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Organization members</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Spinner size={5} />
                    ) : members.length === 0 ? (
                        <p className="text-sm text-slate-400">No members found.</p>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {members.map((member) => {
                                const memberOwner = member.role
                                    .split(',')
                                    .map((role) => role.trim())
                                    .includes('owner');
                                const enabled = member.vendorPortalAccess.granted;
                                return (
                                    <div
                                        key={member.id}
                                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-full bg-slate-800 p-2">
                                                <UserRound className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white">
                                                    {member.user.name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {member.user.email} ·{' '}
                                                    {memberOwner ? 'Owner' : 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant={enabled ? 'outline' : 'default'}
                                            size="sm"
                                            disabled={memberOwner || workingId === member.id}
                                            title={
                                                memberOwner
                                                    ? 'Owner access is implicit and cannot be revoked'
                                                    : undefined
                                            }
                                            onClick={async () => {
                                                setWorkingId(member.id);
                                                setError('');
                                                try {
                                                    await api.updateVendorMemberAccess(
                                                        member.id,
                                                        !enabled
                                                    );
                                                    await load();
                                                    setMessage(
                                                        `${member.user.name} ${enabled ? 'no longer has' : 'now has'} Vendor Portal access.`
                                                    );
                                                } catch (cause) {
                                                    setError(
                                                        cause instanceof Error
                                                            ? cause.message
                                                            : 'Unable to update member access.'
                                                    );
                                                } finally {
                                                    setWorkingId('');
                                                }
                                            }}
                                        >
                                            {workingId === member.id ? (
                                                <Spinner size={4} className="mr-2" />
                                            ) : enabled ? (
                                                <UserX className="mr-2 h-4 w-4" />
                                            ) : (
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                            )}
                                            {memberOwner
                                                ? 'Owner access'
                                                : enabled
                                                  ? 'Revoke portal access'
                                                  : 'Grant portal access'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pending invitations</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Spinner size={5} />
                    ) : invitations.length === 0 ? (
                        <p className="text-sm text-slate-400">No pending invitations.</p>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {invitations.map((invitation) => (
                                <div
                                    key={invitation.id}
                                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {invitation.email}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Expires{' '}
                                            {new Date(invitation.expiresAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={Boolean(workingId)}
                                            onClick={() => invite(true, invitation.email)}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" /> Resend
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={Boolean(workingId)}
                                            onClick={async () => {
                                                setWorkingId(invitation.id);
                                                const result =
                                                    await authClient.organization.cancelInvitation({
                                                        invitationId: invitation.id,
                                                    });
                                                if (result.error)
                                                    setError(
                                                        result.error.message ||
                                                            'Unable to cancel invitation.'
                                                    );
                                                else {
                                                    setMessage(
                                                        `Invitation to ${invitation.email} cancelled.`
                                                    );
                                                    await load();
                                                }
                                                setWorkingId('');
                                            }}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Cancel
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
