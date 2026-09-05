import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { getCurrentVendor } from '@/features/auth/server';

export default async function LoginPage() {
    if (await getCurrentVendor()) redirect('/dashboard');
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
