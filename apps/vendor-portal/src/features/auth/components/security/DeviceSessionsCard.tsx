'use client';

import { KeyRound, Laptop } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAuthIdentity } from '../../queries';
import { useDeviceSessions, useRevokeDeviceSession } from '../../security-queries';

export const DeviceSessionsCard = () => {
    const { data: identity } = useAuthIdentity();
    const sessions = useDeviceSessions();
    const revoke = useRevokeDeviceSession();
    const currentSessionId = identity?.session.id;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-indigo-400" /> Active sessions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {revoke.error && <Alert variant="danger">{getErrorMessage(revoke.error)}</Alert>}
                {sessions.isPending ? (
                    <Spinner size={5} />
                ) : (
                    <div className="divide-y divide-slate-800">
                        {(sessions.data ?? []).map((session) => (
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
                                    disabled={session.id === currentSessionId || revoke.isPending}
                                    onClick={() => revoke.mutate(session.token)}
                                >
                                    <KeyRound className="mr-2 h-4 w-4" /> Revoke
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
