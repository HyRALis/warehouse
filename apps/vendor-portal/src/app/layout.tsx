import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OmniStock - Vendor Portal',
    description: 'Manage your inventory with OmniStock',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <a href="#main-content" className="sr-only z-[100] rounded-lg bg-indigo-600 px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
