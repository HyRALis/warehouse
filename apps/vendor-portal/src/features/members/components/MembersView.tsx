'use client';

import { ShieldCheck } from 'lucide-react';
import { Alert, PageHeader } from '@inventory-system/ui';
import { usePlatformContext } from '@/features/auth';
import { InviteMemberCard } from './InviteMemberCard';
import { MemberList } from './MemberList';
import { PendingInvitations } from './PendingInvitations';

export const MembersView = () => {
    const platform = usePlatformContext();

    if (!platform.data) return null;

    if (!platform.data.membership.isOwner) {
        return (
            <Alert variant="danger" className="mx-auto max-w-2xl">
                <h1 className="font-semibold text-white">Owner access required</h1>
                <p className="mt-2">
                    Only Organization Owners can manage invitations and Vendor Portal access.
                </p>
            </Alert>
        );
    }

    const organizationId = platform.data.organization.id;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Team access"
                description="Invite Organization members and choose who can enter the Vendor Portal."
            />
            <Alert variant="info">
                <ShieldCheck className="mr-2 inline h-4 w-4" /> Owners always have access while the
                Organization subscription is active. Member access can be granted or revoked here.
            </Alert>
            <InviteMemberCard organizationId={organizationId} />
            <MemberList organizationId={organizationId} />
            <PendingInvitations organizationId={organizationId} />
        </div>
    );
};
