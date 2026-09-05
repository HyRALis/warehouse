'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Vendor } from '@inventory-system/contracts';
import { Alert, AlertDialog, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useDeactivateVendor } from '../hooks';

export const DangerZoneCard = ({ vendor }: { vendor: Vendor }) => {
    const deactivateVendor = useDeactivateVendor();
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState('');

    return (
        <>
            <Card className="border-rose-900/50 bg-rose-950/20">
                <CardHeader>
                    <CardTitle className="text-rose-500">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm leading-6 text-slate-400">
                        Deactivate this vendor account and immediately end its sessions. Catalog
                        data is retained until the documented retention and purge process runs.
                    </p>
                    <Button variant="destructive" onClick={() => setOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Deactivate Account
                    </Button>
                </CardContent>
            </Card>
            <AlertDialog
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) setConfirmation('');
                }}
                title="Deactivate vendor account?"
                description={`Type “${vendor.companyName}” to confirm. All current sessions will end.`}
                confirmLabel="Deactivate account"
                pending={deactivateVendor.isPending}
                confirmDisabled={confirmation !== vendor.companyName}
                onConfirm={() => deactivateVendor.mutate()}
            >
                <div className="space-y-2">
                    <Label htmlFor="company-confirmation">Company name</Label>
                    <Input
                        id="company-confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        autoComplete="off"
                    />
                    {deactivateVendor.error && (
                        <Alert variant="danger">{getErrorMessage(deactivateVendor.error)}</Alert>
                    )}
                </div>
            </AlertDialog>
        </>
    );
};
