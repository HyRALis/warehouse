import { Suspense } from 'react';
import { VerifyEmailView } from '@/features/auth';

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailView />
        </Suspense>
    );
}
