import * as React from 'react';
import { cn } from '../utils/cn';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'danger';
}

export const Alert = ({ className, variant = 'info', ...props }: AlertProps) => (
    <div
        role={variant === 'danger' ? 'alert' : 'status'}
        className={cn(
            'rounded-xl border p-4 text-sm',
            {
                'border-indigo-500/20 bg-indigo-500/10 text-indigo-300': variant === 'info',
                'border-emerald-500/20 bg-emerald-500/10 text-emerald-300':
                    variant === 'success',
                'border-amber-500/20 bg-amber-500/10 text-amber-300': variant === 'warning',
                'border-rose-500/20 bg-rose-500/10 text-rose-300': variant === 'danger',
            },
            className
        )}
        {...props}
    />
);
