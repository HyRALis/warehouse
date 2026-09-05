import * as React from 'react';
import { cn } from '../utils/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        aria-hidden="true"
        className={cn('animate-pulse rounded-lg bg-slate-800', className)}
        {...props}
    />
);
