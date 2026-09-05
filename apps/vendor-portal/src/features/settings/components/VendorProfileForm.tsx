'use client';

import { z } from 'zod';
import { Building, Globe2, Save } from 'lucide-react';
import type { VendorProfileContext } from '@inventory-system/contracts';
import { Alert, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@inventory-system/ui';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useUpdateVendorProfile } from '../hooks';

const profileFormSchema = z.object({
    displayName: z.string().trim().min(1, 'Display name is required').max(200),
    description: z.string().trim().max(2000),
    websiteUrl: z.union([z.literal(''), z.string().trim().url('Enter a valid URL')]),
});

/** Empty inputs clear the stored value, which the contract models as `null`, not `''`. */
const toRequest = (value: z.infer<typeof profileFormSchema>) => ({
    displayName: value.displayName,
    description: value.description || null,
    websiteUrl: value.websiteUrl || null,
});

export const VendorProfileForm = ({ profile }: { profile: VendorProfileContext }) => {
    const updateProfile = useUpdateVendorProfile();
    const form = useAppForm({
        defaultValues: {
            displayName: profile.displayName,
            description: profile.description ?? '',
            websiteUrl: profile.websiteUrl ?? '',
        },
        validators: { onSubmit: profileFormSchema },
        onSubmit: async ({ value }) => {
            await updateProfile.mutateAsync(toRequest(value)).catch(() => undefined);
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vendor Profile</CardTitle>
            </CardHeader>
            <CardContent>
                {updateProfile.error && (
                    <Alert variant="danger" className="mb-4">
                        {getErrorMessage(updateProfile.error)}
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
                        <form.AppField name="displayName">
                            {(field) => (
                                <field.TextField
                                    label="Display name"
                                    leading={<Building className="h-5 w-5" />}
                                    serverError={getFieldIssue(updateProfile.error, 'displayName')}
                                />
                            )}
                        </form.AppField>
                        <form.AppField name="description">
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor="profile-description">Description</Label>
                                    <Textarea
                                        id="profile-description"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        maxLength={2000}
                                    />
                                </div>
                            )}
                        </form.AppField>
                        <form.AppField name="websiteUrl">
                            {(field) => (
                                <field.TextField
                                    label="Website"
                                    type="url"
                                    placeholder="https://example.com"
                                    leading={<Globe2 className="h-5 w-5" />}
                                    serverError={getFieldIssue(updateProfile.error, 'websiteUrl')}
                                />
                            )}
                        </form.AppField>
                        <form.SubmitButton pendingLabel="Saving…">
                            <Save className="mr-2 h-4 w-4" /> Save profile
                        </form.SubmitButton>
                    </form.AppForm>
                </form>
            </CardContent>
        </Card>
    );
};
