'use client';

import { DeviceSessionsCard } from './DeviceSessionsCard';
import { TwoFactorCard } from './TwoFactorCard';

export const SecuritySettings = () => (
    <div className="space-y-6">
        <TwoFactorCard />
        <DeviceSessionsCard />
    </div>
);
