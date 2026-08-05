import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
    size?: number;
}

function Spinner({ className, size = 24, ...props }: SpinnerProps) {
    return (
        <Loader2 size={size} className={cn('animate-spin text-slate-400', className)} {...props} />
    );
}

export { Spinner };
