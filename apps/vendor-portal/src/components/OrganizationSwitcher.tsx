'use client';

import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function OrganizationSwitcher() {
    const { organizations, platform, switchOrganization } = useAuth();
    const [switching, setSwitching] = useState(false);
    const [error, setError] = useState('');

    if (organizations.length < 2 || !platform) return null;

    return (
        <div className="relative flex items-center">
            <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
            <select
                aria-label="Active organization"
                value={platform.organization.id}
                disabled={switching}
                title={error || 'Switch organization'}
                onChange={async (event) => {
                    setSwitching(true);
                    setError('');
                    try {
                        await switchOrganization(event.target.value);
                    } catch (cause) {
                        setError(
                            cause instanceof Error ? cause.message : 'Organization switch failed'
                        );
                    } finally {
                        setSwitching(false);
                    }
                }}
                className="h-10 max-w-56 appearance-none rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-9 text-sm text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-60"
            >
                {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                        {organization.name}
                    </option>
                ))}
            </select>
            {switching && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-indigo-400" />
            )}
        </div>
    );
}
