'use client';

import { ShieldCheck, UserRound, UserX } from 'lucide-react';
import type { VendorMemberAccessResponse } from '@inventory-system/contracts';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useMembers, useUpdateMemberAccess } from '../hooks';
import { isOwnerRole } from '../utils/roles';

const accessLabel = (owner: boolean, granted: boolean): string => {
    if (owner) return 'Owner access';
    return granted ? 'Revoke portal access' : 'Grant portal access';
};

const AccessIcon = ({ pending, granted }: { pending: boolean; granted: boolean }) => {
    if (pending) return <Spinner size={4} className="mr-2" />;
    if (granted) return <UserX className="mr-2 h-4 w-4" />;
    return <ShieldCheck className="mr-2 h-4 w-4" />;
};

const MemberRow = ({ member }: { member: VendorMemberAccessResponse }) => {
    const updateAccess = useUpdateMemberAccess();
    const owner = isOwnerRole(member.role);
    const granted = member.vendorPortalAccess.granted;

    return (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-full bg-slate-800 p-2">
                    <UserRound className="h-4 w-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{member.user.name}</p>
                    <p className="truncate text-xs text-slate-500">
                        {member.user.email} · {owner ? 'Owner' : 'Member'}
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant={granted ? 'outline' : 'default'}
                size="sm"
                disabled={owner || updateAccess.isPending}
                title={owner ? 'Owner access is implicit and cannot be revoked' : undefined}
                onClick={() => updateAccess.mutate({ memberId: member.id, enabled: !granted })}
            >
                <AccessIcon pending={updateAccess.isPending} granted={granted} />
                {accessLabel(owner, granted)}
            </Button>
            {updateAccess.error && (
                <Alert variant="danger" role="alert">
                    {getErrorMessage(updateAccess.error)}
                </Alert>
            )}
        </div>
    );
};

const MemberRows = ({ organizationId }: { organizationId: string }) => {
    const members = useMembers(organizationId);

    if (members.isPending) return <Spinner size={5} />;
    if (members.error) return <Alert variant="danger">{getErrorMessage(members.error)}</Alert>;
    if (!members.data?.length) return <p className="text-sm text-slate-400">No members found.</p>;

    return (
        <div className="divide-y divide-slate-800">
            {members.data.map((member) => (
                <MemberRow key={member.id} member={member} />
            ))}
        </div>
    );
};

export const MemberList = ({ organizationId }: { organizationId: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>Organization members</CardTitle>
        </CardHeader>
        <CardContent>
            <MemberRows organizationId={organizationId} />
        </CardContent>
    </Card>
);
