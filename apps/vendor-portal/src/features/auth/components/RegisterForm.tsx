'use client';

import Link from 'next/link';
import { Building, Lock, Mail } from 'lucide-react';
import { Alert } from '@inventory-system/ui';
import { registerVendorRequestSchema } from '@inventory-system/contracts';
import { useAppForm } from '@/lib/forms/app-form';
import { getFieldIssue } from '@/lib/api/client';
import { useRegister } from '../queries';
import { AuthShell } from './AuthShell';

export const RegisterForm = () => {
    const register = useRegister();
    const form = useAppForm({
        defaultValues: { companyName: '', email: '', password: '' },
        validators: { onSubmit: registerVendorRequestSchema },
        onSubmit: async ({ value }) => {
            await register.mutateAsync(value).catch(() => undefined);
        },
    });

    return (
        <AuthShell
            title="Create Account"
            subtitle="Vendor Application"
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
                        Sign In
                    </Link>
                </>
            }
        >
            {register.error && (
                <Alert variant="danger" className="mb-6">
                    {register.error.message}
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
                    <form.AppField name="companyName">
                        {(field) => (
                            <field.TextField
                                label="Company Name"
                                autoComplete="organization"
                                placeholder="Acme Corp"
                                serverError={getFieldIssue(register.error, 'companyName')}
                                leading={<Building className="h-5 w-5" />}
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="email">
                        {(field) => (
                            <field.TextField
                                label="Email Address"
                                type="email"
                                autoComplete="email"
                                placeholder="vendor@company.com"
                                serverError={getFieldIssue(register.error, 'email')}
                                leading={<Mail className="h-5 w-5" />}
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="password">
                        {(field) => (
                            <field.TextField
                                label="Password"
                                type="password"
                                autoComplete="new-password"
                                description="Use at least 12 characters."
                                serverError={getFieldIssue(register.error, 'password')}
                                leading={<Lock className="h-5 w-5" />}
                            />
                        )}
                    </form.AppField>
                    <form.SubmitButton className="w-full" pendingLabel="Creating account…">
                        Create Account
                    </form.SubmitButton>
                </form.AppForm>
            </form>
        </AuthShell>
    );
};
