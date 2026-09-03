'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import QuickCreateMenu from '@/components/QuickCreateMenu';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, platform, loading, accessError, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950" role="status">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
                <span className="sr-only">Loading Vendor Portal</span>
            </div>
        );
    }

    const subscriptionActive = platform?.portal.subscription?.active === true;
    const accessGranted = platform?.portal.access.granted === true;
    if (
        accessError ||
        !platform ||
        !subscriptionActive ||
        !accessGranted ||
        !platform.vendorProfile
    ) {
        return (
            <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
                <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-slate-900 p-8 text-center shadow-xl">
                    <h1 className="text-xl font-semibold text-white">Vendor Portal unavailable</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        {accessError?.message ||
                            (!subscriptionActive
                                ? 'Your organization does not currently have an active Vendor Portal subscription.'
                                : !accessGranted
                                  ? 'Your membership has not been granted Vendor Portal access.'
                                  : 'The primary Vendor Profile is not available.')}
                    </p>
                    <div className="mt-5 flex justify-center">
                        <OrganizationSwitcher />
                    </div>
                    <button
                        className="mt-6 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                        onClick={async () => {
                            await logout();
                            router.replace('/login');
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </main>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header />
                <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
                <QuickCreateMenu variant="floating" className="md:hidden" />
            </div>
        </div>
    );
}
