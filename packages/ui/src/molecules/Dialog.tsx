'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export const Dialog = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: DialogProps) => (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <DialogPrimitive.Content
                className={cn(
                    'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl focus:outline-none',
                    className
                )}
            >
                <DialogPrimitive.Title className="text-lg font-semibold">
                    {title}
                </DialogPrimitive.Title>
                {description && (
                    <DialogPrimitive.Description className="mt-2 text-sm text-slate-400">
                        {description}
                    </DialogPrimitive.Description>
                )}
                <div className="mt-5">{children}</div>
                {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
                <DialogPrimitive.Close
                    className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close dialog"
                >
                    <X className="h-4 w-4" />
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
);
