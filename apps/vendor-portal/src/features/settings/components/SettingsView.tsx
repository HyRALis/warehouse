'use client';

import Link from 'next/link';
import { Alert, PageHeader } from '@inventory-system/ui';
import { SecuritySettings } from '@/features/auth';
import { useAuthIdentity, useCurrentVendor } from '@/features/auth/queries';
import { useVendorProfile } from '../hooks';
import { AccountForm } from './AccountForm';
import { DangerZoneCard } from './DangerZoneCard';
import { VendorProfileForm } from './VendorProfileForm';

const EmailVerificationNotice = () => {
    const { user } = useAuthIdentity();
    if (!user || user.emailVerified) return null;

    return (
        <Alert
            variant="warning"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <span>Verify {user.email} to secure recovery and invitations.</span>
            <Link href="/verify-email" className="font-semibold underline underline-offset-4">
                Verify email
            </Link>
        </Alert>
    );
};

export const SettingsView = () => {
    const vendor = useCurrentVendor();
    const profile = useVendorProfile();

    if (!vendor.data) return <Alert variant="danger">Vendor profile is unavailable.</Alert>;

    const identityKey = `${vendor.data.id}:${vendor.data.updatedAt ?? vendor.data.email}`;

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader
                title="Settings"
                description="Manage your producer identity, account security, and signed-in devices."
            />
            <EmailVerificationNotice />
            {profile.data && (
                <VendorProfileForm key={profile.data.id} profile={profile.data} />
            )}
            <AccountForm key={identityKey} vendor={vendor.data} />
            <SecuritySettings />
            <DangerZoneCard vendor={vendor.data} />
        </div>
    );
};
