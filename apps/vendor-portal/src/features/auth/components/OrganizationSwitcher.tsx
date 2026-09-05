'use client';

import { Building2, Loader2 } from 'lucide-react';
import { Select } from '@inventory-system/ui';
import { useOrganizations, usePlatformContext, useSwitchOrganization } from '../queries';

/**
 * Only rendered for accounts that belong to more than one organization; a single-tenant
 * account has nothing to switch between.
 */
export const OrganizationSwitcher = () => {
    const organizations = useOrganizations();
    const platform = usePlatformContext();
    const switchOrganization = useSwitchOrganization();
    const options = organizations.data ?? [];

    if (options.length < 2 || !platform.data) return null;

    return (
        <div className="relative flex items-center">
            <Building2 className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-slate-500" />
            <Select
                aria-label="Active organization"
                value={platform.data.organization.id}
                disabled={switchOrganization.isPending}
                title={switchOrganization.error?.message || 'Switch organization'}
                onChange={(event) => switchOrganization.mutate(event.target.value)}
                className="max-w-56 appearance-none pl-9 pr-9"
            >
                {options.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                        {organization.name}
                    </option>
                ))}
            </Select>
            {switchOrganization.isPending && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-indigo-400" />
            )}
        </div>
    );
};
