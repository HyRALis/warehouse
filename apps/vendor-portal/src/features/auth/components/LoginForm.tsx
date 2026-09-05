'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { Alert } from '@inventory-system/ui';
import { loginVendorRequestSchema } from '@inventory-system/contracts';
import { useAppForm } from '@/lib/forms/app-form';
import { getFieldIssue } from '@/lib/api/client';
import { useLogin } from '../queries';
import { AuthShell } from './AuthShell';

export const LoginForm = () => {
    const login = useLogin(useSearchParams().get('returnTo'));
    const form = useAppForm({
        defaultValues: { email: '', password: '' },
        validators: { onSubmit: loginVendorRequestSchema },
        onSubmit: async ({ value }) => {
            await login.mutateAsync(value).catch(() => undefined);
        },
    });

    return (
        <AuthShell
            title="Sign In"
            subtitle="Vendor Portal Access"
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
                        Apply now
                    </Link>
                </>
            }
        >
            <Alert variant="info" className="mb-6 text-xs leading-5">
                Existing accounts were moved to secure sessions. Sign in again with your current
                password; no password reset is required.
            </Alert>
            {login.error && (
                <Alert variant="danger" className="mb-6">
                    {login.error.message}
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
                                label="Email Address"
                                type="email"
                                autoComplete="email"
                                placeholder="vendor@company.com"
                                serverError={getFieldIssue(login.error, 'email')}
                                leading={<Mail className="h-5 w-5" />}
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="password">
                        {(field) => (
                            <field.TextField
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                serverError={getFieldIssue(login.error, 'password')}
                                leading={<Lock className="h-5 w-5" />}
                            />
                        )}
                    </form.AppField>
                    <form.SubmitButton className="w-full" pendingLabel="Signing in…">
                        Sign In
                    </form.SubmitButton>
                </form.AppForm>
            </form>
            <p className="mt-4 text-center text-sm">
                <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300">
                    Forgot your password?
                </Link>
            </p>
        </AuthShell>
    );
};
