import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const mocks = vi.hoisted(() => ({ login: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ login: mocks.login, user: null, loading: false }),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

describe('LoginPage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends MFA-enabled accounts to the two-factor challenge', async () => {
        mocks.login.mockResolvedValue({ twoFactorRequired: true, twoFactorMethods: ['totp'] });
        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText('Email Address'), 'owner@example.test');
        await user.type(screen.getByLabelText('Password'), 'correct horse battery staple');
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        expect(mocks.login).toHaveBeenCalledWith(
            'owner@example.test',
            'correct horse battery staple'
        );
        expect(mocks.push).toHaveBeenCalledWith('/two-factor');
    });

    it('explains the one-time session migration reauthentication', () => {
        render(<LoginPage />);
        expect(screen.getByText(/moved to secure sessions/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute(
            'href',
            '/forgot-password'
        );
    });
});
