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
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
