import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OmniStock - Vendor Portal',
    description: 'Manage your inventory with OmniStock',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <a
                    href="#main-content"
                    className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 shadow-xl transition-transform focus:translate-y-0"
                >
                    Skip to main content
                </a>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
