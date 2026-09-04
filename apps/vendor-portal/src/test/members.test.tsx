import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@inventory-system/ui';
import type { VendorMemberAccessResponse } from '@inventory-system/contracts';
import { MemberList } from '@/features/members/components/MemberList';
import { browserApi } from '@/lib/api/browser';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

const member = (
    overrides: Partial<VendorMemberAccessResponse> = {}
): VendorMemberAccessResponse => ({
    id: 'member-1',
    role: 'member',
    createdAt: '2026-08-29T10:00:00.000Z',
    user: {
        id: 'user-1',
        name: 'Riley Chen',
        email: 'riley@example.com',
        image: null,
    },
    vendorPortalAccess: { granted: false, implicit: false, record: null },
    ...overrides,
});

const renderMembers = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <MemberList />
            </ToastProvider>
        </QueryClientProvider>
    );
};

describe('member portal access', () => {
    it('grants access to a member and refreshes the list', async () => {
        const user = userEvent.setup();
        const list = vi
            .spyOn(browserApi.platform, 'members')
            .mockResolvedValueOnce({ success: true, data: [member()] })
            .mockResolvedValue({
                success: true,
                data: [
                    member({
                        vendorPortalAccess: { granted: true, implicit: false, record: null },
                    }),
                ],
            });
        const update = vi.spyOn(browserApi.platform, 'updateMemberAccess').mockResolvedValue({
            success: true,
            data: {
                memberId: 'member-1',
                vendorPortalAccess: { granted: true, implicit: false, record: null },
            },
        });

        renderMembers();
        await user.click(await screen.findByRole('button', { name: /Grant portal access/ }));

        await waitFor(() =>
            expect(update).toHaveBeenCalledWith('member-1', { enabled: true })
        );
        expect(
            await screen.findByRole('button', { name: /Revoke portal access/ })
        ).toBeInTheDocument();
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('never offers to revoke an owner, whose access is implicit', async () => {
        vi.spyOn(browserApi.platform, 'members').mockResolvedValue({
            success: true,
            data: [
                member({
                    role: 'member,owner',
                    vendorPortalAccess: { granted: true, implicit: true, record: null },
                }),
            ],
        });

        renderMembers();
        const button = await screen.findByRole('button', { name: /Owner access/ });
        expect(button).toBeDisabled();
        expect(screen.queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument();
    });
});
