import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecuritySettings from './SecuritySettings';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    verifyTotp: vi.fn(),
    generateBackupCodes: vi.fn(),
    refresh: vi.fn(),
    toDataURL: vi.fn(),
}));

vi.mock('qrcode', () => ({ default: { toDataURL: mocks.toDataURL } }));
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { email: 'owner@example.test', twoFactorEnabled: false },
        refresh: mocks.refresh,
    }),
}));
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        getSession: mocks.getSession,
        listSessions: mocks.listSessions,
        revokeSession: mocks.revokeSession,
        twoFactor: {
            enable: mocks.enable,
            disable: mocks.disable,
            verifyTotp: mocks.verifyTotp,
            generateBackupCodes: mocks.generateBackupCodes,
        },
    },
}));

describe('SecuritySettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ data: { session: { id: 'session-current' } } });
        mocks.listSessions.mockResolvedValue({
            data: [
                {
                    id: 'session-current',
                    token: 'current-token',
                    expiresAt: '2030-01-01T00:00:00.000Z',
                    ipAddress: '127.0.0.1',
                },
                {
                    id: 'session-other',
                    token: 'other-token',
                    expiresAt: '2030-01-01T00:00:00.000Z',
                    userAgent: 'Other browser',
                },
            ],
        });
        mocks.enable.mockResolvedValue({
            data: { totpURI: 'otpauth://totp/test', backupCodes: ['backup-one', 'backup-two'] },
            error: null,
        });
        mocks.toDataURL.mockResolvedValue('data:image/png;base64,qr');
    });

    it('lists sessions and prevents revoking the current session from the row action', async () => {
        render(<SecuritySettings />);
        expect(await screen.findByText('Current session')).toBeInTheDocument();
        const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
        expect(revokeButtons[0]).toBeDisabled();
        expect(revokeButtons[1]).toBeEnabled();
    });

    it('starts TOTP enrollment and shows one-time recovery codes', async () => {
        const user = userEvent.setup();
        render(<SecuritySettings />);
        await screen.findByText('Current session');

        await user.type(screen.getByLabelText('Current password'), 'correct horse battery staple');
        await user.click(screen.getByRole('button', { name: /set up authenticator/i }));

        await waitFor(() => expect(mocks.enable).toHaveBeenCalled());
        expect(screen.getByAltText('Authenticator enrollment QR code')).toBeInTheDocument();
        expect(screen.getByText('backup-one')).toBeInTheDocument();
    });
});
