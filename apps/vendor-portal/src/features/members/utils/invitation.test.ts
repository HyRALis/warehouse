import { describe, expect, it } from 'vitest';
import type { PublicInvitationSummary } from '@inventory-system/contracts';
import { invitationUnavailableReason, isInvitedAccount } from './invitation';

const now = new Date('2026-09-04T12:00:00.000Z');

const invitation = (overrides: Partial<PublicInvitationSummary> = {}): PublicInvitationSummary => ({
    id: 'invitation-1',
    email: 'teammate@example.com',
    organizationId: 'org-1',
    organizationName: 'Acme',
    inviterEmail: 'owner@example.com',
    role: 'member',
    status: 'pending',
    expiresAt: '2026-09-05T12:00:00.000Z',
    ...overrides,
});

describe('invitationUnavailableReason', () => {
    const unavailable =
        'This invitation has expired or has already been used. Ask an Owner to send a new one.';

    it('accepts a pending, unexpired invitation', () => {
        expect(invitationUnavailableReason(invitation(), now)).toBeNull();
    });

    it('rejects an already-accepted invitation', () => {
        expect(invitationUnavailableReason(invitation({ status: 'accepted' }), now)).toBe(
            unavailable
        );
    });

    it('rejects an expired invitation', () => {
        expect(
            invitationUnavailableReason(
                invitation({ expiresAt: '2026-09-03T12:00:00.000Z' }),
                now
            )
        ).toBe(unavailable);
    });
});

describe('isInvitedAccount', () => {
    it('matches regardless of case', () => {
        expect(isInvitedAccount('Teammate@Example.com', 'teammate@example.com')).toBe(true);
    });

    it('rejects a different signed-in account', () => {
        expect(isInvitedAccount('teammate@example.com', 'someone@example.com')).toBe(false);
    });

    it('rejects a signed-out visitor', () => {
        expect(isInvitedAccount('teammate@example.com', undefined)).toBe(false);
    });
});
