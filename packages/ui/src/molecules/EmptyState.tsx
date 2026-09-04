import * as React from 'react';
import { cn } from '../utils/cn';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState = ({
    icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) => (
    <div
        className={cn(
            'rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-6 py-16 text-center',
            className
        )}
        {...props}
    >
        {icon && <div className="mx-auto mb-4 flex justify-center text-slate-600">{icon}</div>}
        <h2 className="text-lg font-medium text-slate-200">{title}</h2>
        {description && <p className="mx-auto mt-2 max-w-xl text-slate-400">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);
