'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Lock } from 'lucide-react';
import { Alert } from '@inventory-system/ui';
import { resetPasswordRequestSchema } from '@inventory-system/contracts';
import { useAppForm } from '@/lib/forms/app-form';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useResetPassword } from '../queries';
import { AuthShell } from './AuthShell';

const resetFormSchema = z
    .object({
        password: resetPasswordRequestSchema.shape.password,
        confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
        path: ['confirmPassword'],
        message: 'The passwords do not match',
    });

export const ResetPasswordForm = () => {
    const token = useSearchParams().get('token') || '';
    const resetPassword = useResetPassword();
    const form = useAppForm({
        defaultValues: { password: '', confirmPassword: '' },
        validators: { onSubmit: resetFormSchema },
        onSubmit: async ({ value }) => {
            await resetPassword.mutateAsync({ token, password: value.password }).catch(() => undefined);
        },
    });

    return (
        <AuthShell
            title="Choose a new password"
            subtitle="Vendor Portal Access"
            description="Use at least 12 characters and a password unique to this account."
            footer={
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                    Return to sign in
                </Link>
            }
        >
            {resetPassword.isSuccess ? (
                <Alert variant="success">{resetPassword.data.message}</Alert>
            ) : (
                <>
                    {!token && (
                        <Alert variant="danger" className="mb-6">
                            This reset link is missing its token. Request a new one.
                        </Alert>
                    )}
                    {resetPassword.error && (
                        <Alert variant="danger" className="mb-6">
                            {getErrorMessage(resetPassword.error)}
                        </Alert>
                    )}
                    <form
                        className="space-y-5"
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void form.handleSubmit();
                        }}
                    >
                        <form.AppForm>
                            <form.AppField name="password">
                                {(field) => (
                                    <field.TextField
                                        label="New password"
                                        type="password"
                                        autoComplete="new-password"
                                        disabled={!token}
                                        serverError={getFieldIssue(resetPassword.error, 'password')}
                                        leading={<Lock className="h-5 w-5" />}
                                    />
                                )}
                            </form.AppField>
                            <form.AppField name="confirmPassword">
                                {(field) => (
                                    <field.TextField
                                        label="Confirm password"
                                        type="password"
                                        autoComplete="new-password"
                                        disabled={!token}
                                        leading={<Lock className="h-5 w-5" />}
                                    />
                                )}
                            </form.AppField>
                            <form.SubmitButton className="w-full" pendingLabel="Resetting…">
                                Reset password
                            </form.SubmitButton>
                        </form.AppForm>
                    </form>
                </>
            )}
        </AuthShell>
    );
};
