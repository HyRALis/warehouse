import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VendorPlatformContext } from '@inventory-system/contracts';
import { platformContextQueryKey, sessionQueryKey } from '@/features/auth/query-options';
import { UiStoreProvider } from '@/state/ui-store';
import Sidebar from './Sidebar';

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const timestamp = '2026-08-29T10:00:00.000Z';

const platformContext = (isOwner: boolean): VendorPlatformContext => ({
    organization: { id: 'org-1', name: 'Studio One', slug: 'studio-one', logo: null },
    membership: { id: 'member-1', role: isOwner ? 'owner' : 'member', isOwner },
    portal: {
        key: 'vendor',
        subscription: {
            status: 'ACTIVE',
            startsAt: timestamp,
            endsAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            active: true,
        },
        access: { granted: true, implicit: isOwner, record: null },
    },
    vendorProfile: {
        id: 'profile-1',
        profileKey: 'primary',
        displayName: 'Studio One',
        description: null,
        websiteUrl: null,
        logoUrl: null,
    },
});

const renderSidebar = (isOwner: boolean) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(sessionQueryKey, {
        id: 'vendor-1',
        email: 'person@example.test',
        companyName: 'Studio One',
        createdAt: timestamp,
    });
    queryClient.setQueryData(platformContextQueryKey, platformContext(isOwner));
    return render(
        <QueryClientProvider client={queryClient}>
            <UiStoreProvider>
                <Sidebar />
            </UiStoreProvider>
        </QueryClientProvider>
    );
};

describe('Sidebar permissions', () => {
    it('shows team access to an Organization Owner', () => {
        renderSidebar(true);
        expect(screen.getByRole('link', { name: /team access/i })).toBeInTheDocument();
    });

    it('hides team access from a non-owner member', () => {
        renderSidebar(false);
        expect(screen.queryByRole('link', { name: /team access/i })).not.toBeInTheDocument();
    });

    it('marks the active route and gives the icon-only logout control a name', () => {
        renderSidebar(true);

        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
            'aria-current',
            'page'
        );
        expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    });
});
