import type { PublicInvitationSummary } from '@inventory-system/contracts';

/** A summary is only actionable while it is still pending and unexpired. */
export const invitationUnavailableReason = (
    invitation: PublicInvitationSummary,
    now: Date = new Date()
): string | null =>
    invitation.status !== 'pending' || new Date(invitation.expiresAt) <= now
        ? 'This invitation has expired or has already been used. Ask an Owner to send a new one.'
        : null;

export const isInvitedAccount = (
    invitationEmail: string,
    signedInEmail: string | undefined
): boolean => signedInEmail?.toLowerCase() === invitationEmail.toLowerCase();
