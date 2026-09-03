'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { KeyRound, Laptop, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Spinner,
} from '@inventory-system/ui';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/context/AuthContext';

interface SessionRecord {
    id: string;
    token: string;
    createdAt: Date | string;
    expiresAt: Date | string;
    ipAddress?: string | null;
    userAgent?: string | null;
}

interface Enrollment {
    totpURI: string;
    qrCode: string;
    backupCodes: string[];
}

const errorMessage = (error: { message?: string } | null | undefined, fallback: string) =>
    error?.message || fallback;

export default function SecuritySettings() {
    const { user, refresh } = useAuth();
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState('');
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadSessions = useCallback(async () => {
        setLoadingSessions(true);
        const [sessionResult, sessionsResult] = await Promise.all([
            authClient.getSession(),
            authClient.listSessions(),
        ]);
        setCurrentSessionId(sessionResult.data?.session.id || '');
        setSessions((sessionsResult.data ?? []) as SessionRecord[]);
        setLoadingSessions(false);
    }, []);

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    const beginEnrollment = async () => {
        setWorking(true);
        setError('');
        setMessage('');
        const result = await authClient.twoFactor.enable({ password, method: 'totp' });
        if (result.error || !result.data || !('totpURI' in result.data)) {
            setError(errorMessage(result.error, 'Unable to start two-factor enrollment.'));
        } else {
            setEnrollment({
                totpURI: result.data.totpURI,
                qrCode: await QRCode.toDataURL(result.data.totpURI, { width: 220, margin: 1 }),
                backupCodes: result.data.backupCodes,
            });
            setBackupCodes(result.data.backupCodes);
            setPassword('');
        }
        setWorking(false);
    };

    const confirmEnrollment = async () => {
        setWorking(true);
        setError('');
        const result = await authClient.twoFactor.verifyTotp({
            code: verificationCode.replace(/\s/g, ''),
        });
        if (result.error) {
            setError(errorMessage(result.error, 'The authenticator code is invalid.'));
        } else {
            setEnrollment(null);
            setVerificationCode('');
            setMessage('Two-factor authentication is enabled. Save the recovery codes now.');
            await refresh();
        }
        setWorking(false);
    };

    const disableTwoFactor = async () => {
        setWorking(true);
        setError('');
        const result = await authClient.twoFactor.disable({ password });
        if (result.error)
            setError(errorMessage(result.error, 'Unable to disable two-factor authentication.'));
        else {
            setMessage('Two-factor authentication is disabled.');
            setPassword('');
            setBackupCodes([]);
            await refresh();
        }
        setWorking(false);
    };

    const regenerateBackupCodes = async () => {
        setWorking(true);
        setError('');
        const result = await authClient.twoFactor.generateBackupCodes({ password });
        if (result.error)
            setError(errorMessage(result.error, 'Unable to generate recovery codes.'));
        else {
            setBackupCodes(result.data?.backupCodes ?? []);
            setPassword('');
            setMessage('Previous recovery codes were replaced.');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" /> Two-factor
                        authentication
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <p className="text-sm leading-6 text-slate-400">
                        Protect account access with an authenticator app and single-use recovery
                        codes.
                    </p>
                    {message && (
                        <div
                            role="status"
                            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                        >
                            {message}
                        </div>
                    )}
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"
                        >
                            {error}
                        </div>
                    )}

                    {enrollment ? (
                        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                            <div className="flex flex-col gap-5 sm:flex-row">
                                <Image
                                    src={enrollment.qrCode}
                                    alt="Authenticator enrollment QR code"
                                    width={220}
                                    height={220}
                                    unoptimized
                                    className="h-[220px] w-[220px] rounded-lg bg-white p-2"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white">Scan this code</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Then enter the six-digit code generated by your
                                        authenticator. If scanning is unavailable, copy the setup
                                        URI below.
                                    </p>
                                    <code className="mt-3 block break-all rounded bg-slate-950 p-2 text-xs text-slate-400">
                                        {enrollment.totpURI}
                                    </code>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="enrollment-code">Authenticator code</Label>
                                <Input
                                    id="enrollment-code"
                                    className="mt-1.5 max-w-xs font-mono tracking-widest"
                                    value={verificationCode}
                                    onChange={(event) => setVerificationCode(event.target.value)}
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    disabled={working || !verificationCode.trim()}
                                    onClick={confirmEnrollment}
                                >
                                    {working && <Spinner size={4} className="mr-2" />} Confirm setup
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEnrollment(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="security-password">Current password</Label>
                                <Input
                                    id="security-password"
                                    className="mt-1.5"
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
                                        disabled={working || !password}
                                        onClick={regenerateBackupCodes}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" /> New recovery codes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={working || !password}
                                        onClick={disableTwoFactor}
                                    >
                                        <ShieldOff className="mr-2 h-4 w-4" /> Disable
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    disabled={working || !password}
                                    onClick={beginEnrollment}
                                >
                                    <Smartphone className="mr-2 h-4 w-4" /> Set up authenticator
                                </Button>
                            )}
                        </div>
                    )}

                    {backupCodes.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                            <p className="font-medium text-amber-200">
                                Recovery codes — shown only now
                            </p>
                            <p className="mt-1 text-xs text-amber-200/70">
                                Store these somewhere safe. Each code works once.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-amber-100">
                                {backupCodes.map((code) => (
                                    <code key={code}>{code}</code>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Laptop className="h-5 w-5 text-indigo-400" /> Active sessions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSessions ? (
                        <Spinner size={5} />
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-200">
                                            {session.id === currentSessionId
                                                ? 'Current session'
                                                : session.userAgent || 'Signed-in device'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {session.ipAddress || 'IP unavailable'} · expires{' '}
                                            {new Date(session.expiresAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={session.id === currentSessionId}
                                        onClick={async () => {
                                            await authClient.revokeSession({
                                                token: session.token,
                                            });
                                            await loadSessions();
                                        }}
                                    >
                                        <KeyRound className="mr-2 h-4 w-4" /> Revoke
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
