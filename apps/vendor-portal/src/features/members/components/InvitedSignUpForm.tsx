'use client';

import Link from 'next/link';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import type { PublicInvitationSummary } from '@inventory-system/contracts';
import { Alert } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useCreateInvitedAccount } from '../hooks';

const signUpFormSchema = z.object({
    name: z.string().trim().min(1, 'Your name is required').max(200),
    password: z.string().min(12, 'Password must be at least 12 characters'),
});

/** The email is fixed by the invitation, so it is not an editable field. */
export const InvitedSignUpForm = ({
    invitation,
    invitationId,
    onSignedUp,
}: {
    invitation: PublicInvitationSummary;
    invitationId: string;
    onSignedUp: () => void;
}) => {
    const createAccount = useCreateInvitedAccount();
    const form = useAppForm({
        defaultValues: { name: '', password: '' },
        validators: { onSubmit: signUpFormSchema },
        onSubmit: async ({ value }) => {
            await createAccount
                .mutateAsync({ ...value, email: invitation.email })
                .then(onSignedUp, () => undefined);
        },
    });
    const returnTo = encodeURIComponent(`/accept-invitation?invitationId=${invitationId}`);

    return (
        <>
            {createAccount.error && (
                <Alert variant="danger">{getErrorMessage(createAccount.error)}</Alert>
            )}
            <form
                className="space-y-4"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                }}
            >
                <form.AppForm>
                    <form.AppField name="name">
                        {(field) => <field.TextField label="Your name" autoComplete="name" />}
                    </form.AppField>
                    <form.AppField name="password">
                        {(field) => (
                            <field.TextField
                                label="Create a password"
                                type="password"
                                autoComplete="new-password"
                                description="Use at least 12 characters."
                            />
                        )}
                    </form.AppField>
                    <form.SubmitButton className="w-full" pendingLabel="Creating account…">
                        <UserPlus className="mr-2 h-4 w-4" /> Create account and accept
                    </form.SubmitButton>
                </form.AppForm>
            </form>
            <p className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link
                    href={`/login?returnTo=${returnTo}`}
                    className="text-indigo-400 hover:text-indigo-300"
                >
                    Sign in first
                </Link>
            </p>
        </>
    );
};
