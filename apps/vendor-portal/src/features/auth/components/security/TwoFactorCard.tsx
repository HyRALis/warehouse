'use client';

import { useState } from 'react';
import { RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
} from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAuthIdentity } from '../../queries';
import {
    useDisableTwoFactor,
    useEnableTwoFactor,
    useRegenerateBackupCodes,
    type TwoFactorEnrollment,
} from '../../security-queries';
import { BackupCodes } from './BackupCodes';
import { TwoFactorEnrollmentPanel } from './TwoFactorEnrollmentPanel';

export const TwoFactorCard = () => {
    const { user } = useAuthIdentity();
    const [password, setPassword] = useState('');
    const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [notice, setNotice] = useState('');

    const enable = useEnableTwoFactor();
    const disable = useDisableTwoFactor();
    const regenerate = useRegenerateBackupCodes();
    const pending = enable.isPending || disable.isPending || regenerate.isPending;
    const error = enable.error || disable.error || regenerate.error;

    const startEnrollment = () => {
        setNotice('');
        enable.mutate(password, {
            onSuccess: (result) => {
                setPassword('');
                setEnrollment(result);
                setBackupCodes(result.backupCodes);
            },
        });
    };

    const stopTwoFactor = () => {
        setNotice('');
        disable.mutate(password, {
            onSuccess: () => {
                setPassword('');
                setBackupCodes([]);
                setNotice('Two-factor authentication is disabled.');
            },
        });
    };

    const replaceBackupCodes = () => {
        setNotice('');
        regenerate.mutate(password, {
            onSuccess: (codes) => {
                setPassword('');
                setBackupCodes(codes);
                setNotice('Previous recovery codes were replaced.');
            },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" /> Two-factor authentication
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <p className="text-sm leading-6 text-slate-400">
                    Protect account access with an authenticator app and single-use recovery codes.
                </p>
                {notice && <Alert variant="success">{notice}</Alert>}
                {error && <Alert variant="danger">{getErrorMessage(error)}</Alert>}

                {enrollment ? (
                    <TwoFactorEnrollmentPanel
                        enrollment={enrollment}
                        onCancel={() => setEnrollment(null)}
                        onConfirmed={() => {
                            setEnrollment(null);
                            setNotice(
                                'Two-factor authentication is enabled. Save the recovery codes now.'
                            );
                        }}
                    />
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="security-password">Current password</Label>
                            <Input
                                id="security-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        {user?.twoFactorEnabled ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={pending || !password}
                                    onClick={replaceBackupCodes}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> New recovery codes
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={pending || !password}
                                    onClick={stopTwoFactor}
                                >
                                    <ShieldOff className="mr-2 h-4 w-4" /> Disable
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                disabled={pending || !password}
                                onClick={startEnrollment}
                            >
                                <Smartphone className="mr-2 h-4 w-4" /> Set up authenticator
                            </Button>
                        )}
                    </div>
                )}

                <BackupCodes codes={backupCodes} />
            </CardContent>
        </Card>
    );
};
