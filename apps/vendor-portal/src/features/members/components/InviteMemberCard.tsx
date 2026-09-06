'use client';

import { z } from 'zod';
import { MailPlus } from 'lucide-react';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useInviteMember } from '../hooks';

const inviteFormSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
});

export const InviteMemberCard = ({ organizationId }: { organizationId: string }) => {
    const invite = useInviteMember(organizationId);
    const form = useAppForm({
        defaultValues: { email: '' },
        validators: { onSubmit: inviteFormSchema },
        onSubmit: async ({ value, formApi }) => {
            await invite.mutateAsync({ email: value.email }).then(
                () => formApi.reset(),
                () => undefined
            );
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invite a member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {invite.error && <Alert variant="danger">{getErrorMessage(invite.error)}</Alert>}
                <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <form.AppForm>
                        <div className="flex-1">
                            <form.AppField name="email">
                                {(field) => (
                                    <field.TextField
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="teammate@example.com"
                                    />
                                )}
                            </form.AppField>
                        </div>
                        <form.SubmitButton pendingLabel="Sending…">
                            <MailPlus className="mr-2 h-4 w-4" /> Send invitation
                        </form.SubmitButton>
                    </form.AppForm>
                </form>
            </CardContent>
        </Card>
    );
};
