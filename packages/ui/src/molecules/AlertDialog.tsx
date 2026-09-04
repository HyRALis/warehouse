'use client';

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from '../atoms/Button';

export interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    pending?: boolean;
    confirmDisabled?: boolean;
    children?: React.ReactNode;
}

export const AlertDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    pending,
    confirmDisabled,
    children,
}: AlertDialogProps) => (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialogPrimitive.Portal>
            <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl focus:outline-none">
                <AlertDialogPrimitive.Title className="text-lg font-semibold">
                    {title}
                </AlertDialogPrimitive.Title>
                <AlertDialogPrimitive.Description className="mt-2 text-sm text-slate-400">
                    {description}
                </AlertDialogPrimitive.Description>
                {children && <div className="mt-5">{children}</div>}
                <div className="mt-6 flex justify-end gap-3">
                    <AlertDialogPrimitive.Cancel asChild>
                        <Button type="button" variant="outline" disabled={pending}>
                            {cancelLabel}
                        </Button>
                    </AlertDialogPrimitive.Cancel>
                    <AlertDialogPrimitive.Action asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onConfirm}
                            disabled={pending || confirmDisabled}
                        >
                            {pending ? 'Working…' : confirmLabel}
                        </Button>
                    </AlertDialogPrimitive.Action>
                </div>
            </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
);
