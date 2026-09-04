import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { browserApi } from '@/lib/api/browser';

const push = vi.fn();
const replace = vi.fn();
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace }),
    useSearchParams: () => searchParams,
}));

const renderWithQuery = (view: React.ReactNode) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}>{view}</QueryClientProvider>);
};

describe('vendor authentication flows', () => {
    it('sends an unfinished login to the two-factor challenge instead of the dashboard', async () => {
        const user = userEvent.setup();
        vi.spyOn(browserApi.auth, 'login').mockResolvedValue({
            success: true,
            data: { twoFactorRequired: true, twoFactorMethods: ['totp'] },
        });
        renderWithQuery(<LoginForm />);

        await user.type(screen.getByLabelText('Email Address'), 'vendor@example.com');
        await user.type(screen.getByLabelText('Password'), 'correct horse battery');
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        await waitFor(() => expect(push).toHaveBeenCalledWith('/two-factor'));
        expect(replace).not.toHaveBeenCalledWith('/dashboard');
    });

    it('reports the neutral confirmation after requesting a reset link', async () => {
        const user = userEvent.setup();
        vi.spyOn(browserApi.auth, 'forgotPassword').mockResolvedValue({
            success: true,
            data: null,
            message: 'If the email exists, a reset link has been sent.',
        });
        renderWithQuery(<ForgotPasswordForm />);

        await user.type(screen.getByLabelText('Email address'), 'vendor@example.com');
        await user.click(screen.getByRole('button', { name: 'Send reset link' }));

        expect(
            await screen.findByText('If the email exists, a reset link has been sent.')
        ).toBeInTheDocument();
    });

    it('refuses to submit a reset when the confirmation does not match', async () => {
        const user = userEvent.setup();
        searchParams.set('token', 'reset-token');
        const resetPassword = vi.spyOn(browserApi.auth, 'resetPassword');
        renderWithQuery(<ResetPasswordForm />);

        await user.type(screen.getByLabelText('New password'), 'correct horse battery');
        await user.type(screen.getByLabelText('Confirm password'), 'a different password');
        await user.click(screen.getByRole('button', { name: 'Reset password' }));

        expect(await screen.findByText('The passwords do not match')).toBeInTheDocument();
        expect(resetPassword).not.toHaveBeenCalled();
    });
});
