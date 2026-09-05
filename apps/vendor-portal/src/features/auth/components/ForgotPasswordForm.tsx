'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Alert } from '@inventory-system/ui';
import { forgotPasswordRequestSchema } from '@inventory-system/contracts';
import { useAppForm } from '@/lib/forms/app-form';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useForgotPassword } from '../queries';
import { AuthShell } from './AuthShell';

export const ForgotPasswordForm = () => {
    const forgotPassword = useForgotPassword();
    const form = useAppForm({
        defaultValues: { email: '' },
        validators: { onSubmit: forgotPasswordRequestSchema },
        onSubmit: async ({ value }) => {
            await forgotPassword.mutateAsync(value).catch(() => undefined);
        },
    });

    return (
        <AuthShell
            title="Reset your password"
            subtitle="Vendor Portal Access"
            description="We will send a secure reset link if the address belongs to an account."
            footer={
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                    Back to sign in
                </Link>
            }
        >
            {forgotPassword.isSuccess ? (
                <Alert variant="success">{forgotPassword.data.message}</Alert>
            ) : (
                <>
                    {forgotPassword.error && (
                        <Alert variant="danger" className="mb-6">
                            {getErrorMessage(forgotPassword.error)}
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
                            <form.AppField name="email">
                                {(field) => (
                                    <field.TextField
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="vendor@company.com"
                                        serverError={getFieldIssue(forgotPassword.error, 'email')}
                                        leading={<Mail className="h-5 w-5" />}
                                    />
                                )}
                            </form.AppField>
                            <form.SubmitButton className="w-full" pendingLabel="Sending…">
                                Send reset link
                            </form.SubmitButton>
                        </form.AppForm>
                    </form>
                </>
            )}
        </AuthShell>
    );
};
