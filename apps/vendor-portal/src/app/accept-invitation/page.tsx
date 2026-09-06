import { Suspense } from 'react';
import { AcceptInvitationView } from '@/features/members';

export default function AcceptInvitationPage() {
    return (
        <Suspense>
            <AcceptInvitationView />
        </Suspense>
    );
}
