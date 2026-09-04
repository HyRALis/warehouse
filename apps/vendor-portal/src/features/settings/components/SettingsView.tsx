'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Building, Mail, Save, Trash2 } from 'lucide-react';
import { updateVendorRequestSchema, type Vendor } from '@inventory-system/contracts';
import { Alert, AlertDialog, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, PageHeader } from '@inventory-system/ui';
import { useCurrentVendor } from '@/features/auth/queries';
import { getErrorMessage, getFieldIssue } from '@/lib/api/client';
import { useAppForm } from '@/lib/forms/app-form';
import { useDeactivateVendor, useUpdateVendor } from '../hooks';

const settingsFormSchema = z.object({
    companyName: z.string().trim().min(1, 'Company name is required').max(200),
    email: z.string().trim().email('Enter a valid email address'),
});

const ProfileSettingsForm = ({ vendor }: { vendor: Vendor }) => {
    const updateVendor = useUpdateVendor();
    const deactivateVendor = useDeactivateVendor();
    const [dangerOpen, setDangerOpen] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const form = useAppForm({
        defaultValues: { companyName: vendor.companyName, email: vendor.email },
        validators: { onSubmit: settingsFormSchema },
        onSubmit: async ({ value }) => { await updateVendor.mutateAsync(updateVendorRequestSchema.parse(value)).catch(() => undefined); },
    });
    return <div className="space-y-6">
        <Card><CardHeader><CardTitle>Vendor Profile</CardTitle></CardHeader><CardContent>
            {updateVendor.error && <Alert variant="danger" className="mb-4">{getErrorMessage(updateVendor.error)}</Alert>}
            <form className="space-y-5" noValidate onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}><form.AppForm>
                <form.AppField name="companyName">{(field) => <field.TextField label="Company name" leading={<Building className="h-5 w-5" />} serverError={getFieldIssue(updateVendor.error, 'companyName')} />}</form.AppField>
                <form.AppField name="email">{(field) => <field.TextField label="Email address" type="email" leading={<Mail className="h-5 w-5" />} serverError={getFieldIssue(updateVendor.error, 'email')} />}</form.AppField>
                <form.SubmitButton pendingLabel="Saving…"><Save className="mr-2 h-4 w-4" /> Save Changes</form.SubmitButton>
            </form.AppForm></form>
        </CardContent></Card>
        <Card className="border-rose-900/50 bg-rose-950/20"><CardHeader><CardTitle className="text-rose-500">Danger Zone</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-slate-400">Deactivate this vendor account and immediately end its sessions. Catalog data is retained until the documented retention and purge process runs.</p><Button variant="destructive" onClick={() => setDangerOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Deactivate Account</Button></CardContent></Card>
        <AlertDialog open={dangerOpen} onOpenChange={(open) => { setDangerOpen(open); if (!open) setConfirmation(''); }} title="Deactivate vendor account?" description={`Type “${vendor.companyName}” to confirm. All current sessions will end.`} confirmLabel="Deactivate account" pending={deactivateVendor.isPending} confirmDisabled={confirmation !== vendor.companyName} onConfirm={() => deactivateVendor.mutate()}>
            <div className="space-y-2"><Label htmlFor="company-confirmation">Company name</Label><Input id="company-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />{deactivateVendor.error && <Alert variant="danger">{getErrorMessage(deactivateVendor.error)}</Alert>}</div>
        </AlertDialog>
    </div>;
};

export const SettingsView = () => {
    const vendor = useCurrentVendor();
    if (!vendor.data) return <Alert variant="danger">Vendor profile is unavailable.</Alert>;
    return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title="Settings" description="Manage your vendor profile and preferences" /><ProfileSettingsForm key={`${vendor.data.id}:${vendor.data.updatedAt ?? vendor.data.email}`} vendor={vendor.data} /></div>;
};
