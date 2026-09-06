import * as React from 'react';
import { cn } from '../utils/cn';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

export const PageHeader = ({
    title,
    description,
    actions,
    className,
    ...props
}: PageHeaderProps) => (
    <div
        className={cn(
            'flex flex-col justify-between gap-4 sm:flex-row sm:items-center',
            className
        )}
        {...props}
    >
        <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
);
