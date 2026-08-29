import type { ReactNode } from 'react';
import { Card, CardContent, cn } from '@inventory-system/ui';

export const StatCard = ({ icon, label, value, className }: { icon: ReactNode; label: string; value: number | string; className?: string }) => (
    <Card><CardContent className="flex items-start gap-4 p-6"><div className={cn('rounded-xl border border-current/20 p-3', className)}>{icon}</div><div><div className="mb-1 text-sm font-medium text-slate-400">{label}</div><div className="text-3xl font-bold text-white">{value}</div></div></CardContent></Card>
);
