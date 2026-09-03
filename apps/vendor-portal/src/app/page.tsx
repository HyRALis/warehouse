'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@inventory-system/ui';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/dashboard');
            } else {
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <Spinner size={10} />
                <p className="font-medium text-slate-400">Checking authentication...</p>
            </div>
        </div>
    );
}
