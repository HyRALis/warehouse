'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

type ToastVariant = 'info' | 'success' | 'danger';
interface ToastMessage {
    id: number;
    title: string;
    description?: string;
    variant: ToastVariant;
}
interface ToastContextValue {
    notify: (message: Omit<ToastMessage, 'id' | 'variant'> & { variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [messages, setMessages] = React.useState<ToastMessage[]>([]);
    const nextId = React.useRef(0);
    const notify = React.useCallback<ToastContextValue['notify']>((message) => {
        nextId.current += 1;
        setMessages((current) => [
            ...current,
            { id: nextId.current, variant: 'info', ...message },
        ]);
    }, []);

    return (
        <ToastContext.Provider value={{ notify }}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}
                {messages.map((message) => (
                    <ToastPrimitive.Root
                        key={message.id}
                        defaultOpen
                        duration={4500}
                        onOpenChange={(open) => {
                            if (!open) {
                                setMessages((current) =>
                                    current.filter((item) => item.id !== message.id)
                                );
                            }
                        }}
                        className={cn(
                            'relative rounded-xl border bg-slate-900 p-4 pr-10 text-slate-100 shadow-2xl',
                            {
                                'border-slate-700': message.variant === 'info',
                                'border-emerald-500/40': message.variant === 'success',
                                'border-rose-500/40': message.variant === 'danger',
                            }
                        )}
                    >
                        <ToastPrimitive.Title className="font-medium">
                            {message.title}
                        </ToastPrimitive.Title>
                        {message.description && (
                            <ToastPrimitive.Description className="mt-1 text-sm text-slate-400">
                                {message.description}
                            </ToastPrimitive.Description>
                        )}
                        <ToastPrimitive.Close
                            className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-white"
                            aria-label="Dismiss notification"
                        >
                            <X className="h-4 w-4" />
                        </ToastPrimitive.Close>
                    </ToastPrimitive.Root>
                ))}
                <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none" />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextValue => {
    const value = React.useContext(ToastContext);
    if (!value) throw new Error('useToast must be used within ToastProvider');
    return value;
};
