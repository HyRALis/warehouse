import * as React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const buttonVariants = ({ variant = 'default', size = 'default', className }: Pick<ButtonProps, 'variant' | 'size' | 'className'> = {}) =>
    cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50',
        {
            'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500': variant === 'default',
            'bg-rose-500 text-white shadow-sm shadow-rose-500/20 hover:bg-rose-600': variant === 'destructive',
            'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800': variant === 'outline',
            'bg-slate-800 text-slate-100 hover:bg-slate-700': variant === 'secondary',
            'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100': variant === 'ghost',
            'text-indigo-400 underline-offset-4 hover:underline': variant === 'link',
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-lg px-3': size === 'sm',
            'h-11 rounded-xl px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
        },
        className
    );

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={buttonVariants({ variant, size, className })}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
