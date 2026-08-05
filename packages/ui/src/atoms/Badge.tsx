import * as React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                {
                    'border border-indigo-500/20 bg-indigo-500/10 text-indigo-400':
                        variant === 'default',
                    'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400':
                        variant === 'success',
                    'border border-amber-500/20 bg-amber-500/10 text-amber-400':
                        variant === 'warning',
                    'border border-rose-500/20 bg-rose-500/10 text-rose-400': variant === 'danger',
                    'border border-slate-700 text-slate-100': variant === 'outline',
                },
                className
            )}
            {...props}
        />
    );
}

export { Badge };
