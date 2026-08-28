'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import QuickCreateMenu from '@/components/QuickCreateMenu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { vendor, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !vendor) {
            router.push('/login');
        }
    }, [vendor, loading, router]);

    if (loading || !vendor) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
                <QuickCreateMenu variant="floating" className="md:hidden" />
            </div>
        </div>
    );
}
