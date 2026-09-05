'use client';

import { z } from 'zod';
import { Building, Mail, Save } from 'lucide-react';
import { updateVendorRequestSchema, type Vendor } from '@inventory-system/contracts';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@inventory-system/ui';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useUpdateVendor } from '../hooks';

const accountFormSchema = z.object({
    companyName: z.string().trim().min(1, 'Company name is required').max(200),
    email: z.string().trim().email('Enter a valid email address'),
});

export const AccountForm = ({ vendor }: { vendor: Vendor }) => {
    const updateVendor = useUpdateVendor();
    const form = useAppForm({
        defaultValues: { companyName: vendor.companyName, email: vendor.email },
        validators: { onSubmit: accountFormSchema },
        onSubmit: async ({ value }) => {
            await updateVendor
                .mutateAsync(updateVendorRequestSchema.parse(value))
                .catch(() => undefined);
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
                {updateVendor.error && (
                    <Alert variant="danger" className="mb-4">
                        {getErrorMessage(updateVendor.error)}
                    </Alert>
                )}
                <form
                    className="space-y-5"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <form.AppForm>
                        <form.AppField name="companyName">
                            {(field) => (
                                <field.TextField
                                    label="Company name"
                                    leading={<Building className="h-5 w-5" />}
                                    serverError={getFieldIssue(updateVendor.error, 'companyName')}
                                />
                            )}
                        </form.AppField>
                        <form.AppField name="email">
                            {(field) => (
                                <field.TextField
                                    label="Email address"
                                    type="email"
                                    leading={<Mail className="h-5 w-5" />}
                                    serverError={getFieldIssue(updateVendor.error, 'email')}
                                />
                            )}
                        </form.AppField>
                        <form.SubmitButton pendingLabel="Saving…">
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </form.SubmitButton>
                    </form.AppForm>
                </form>
            </CardContent>
        </Card>
    );
};
