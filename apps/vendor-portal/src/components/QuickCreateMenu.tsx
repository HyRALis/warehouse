'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, FolderPlus, LayoutTemplate, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@inventory-system/ui';

interface QuickCreateMenuProps {
    variant?: 'header' | 'floating';
    className?: string;
}

const actions = [
    {
        href: '/dashboard/products/new',
        label: 'Add Product',
        description: 'Create a product and its first sellable version',
        icon: FilePlus2,
        primary: true,
    },
    {
        href: '/dashboard/templates?create=true',
        label: 'Add Template',
        description: 'Reuse product characteristics',
        icon: LayoutTemplate,
        primary: false,
    },
    {
        href: '/dashboard/categories?create=true',
        label: 'Add Category',
        description: 'Create a custom category',
        icon: FolderPlus,
        primary: false,
    },
];

export default function QuickCreateMenu({ variant = 'header', className }: QuickCreateMenuProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

    const close = (restoreFocus = false) => {
        setOpen(false);
        if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
    };

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return;
        const handlePointer = (event: MouseEvent | TouchEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) close();
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
            }
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('touchstart', handlePointer);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const handleMenuKeyDown = (event: React.KeyboardEvent) => {
        const current = itemRefs.current.indexOf(document.activeElement as HTMLAnchorElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const next = current < 0 ? (direction > 0 ? 0 : actions.length - 1) : (current + direction + actions.length) % actions.length;
            itemRefs.current[next]?.focus();
        }
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            itemRefs.current[event.key === 'Home' ? 0 : actions.length - 1]?.focus();
        }
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            {variant === 'floating' && open && (
                <button
                    type="button"
                    aria-label="Dismiss quick create menu"
                    className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
                    onClick={() => close(true)}
                />
            )}
            <button
                ref={triggerRef}
                type="button"
                aria-label={open ? 'Close quick create menu' : 'Open quick create menu'}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        setOpen(true);
                        requestAnimationFrame(() => itemRefs.current[event.key === 'ArrowDown' ? 0 : actions.length - 1]?.focus());
                    }
                }}
                className={cn(
                    'relative z-50 inline-flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                    variant === 'floating' ? 'fixed bottom-6 right-6 h-14 w-14 md:hidden' : 'h-10 w-10'
                )}
            >
                {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label="Create"
                    onKeyDown={handleMenuKeyDown}
                    className={cn(
                        'z-50 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-black/40',
                        variant === 'floating'
                            ? 'fixed inset-x-4 bottom-24 md:hidden'
                            : 'absolute right-0 top-12 w-[22rem]'
                    )}
                >
                    <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create</p>
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.href}
                                ref={(element) => { itemRefs.current[index] = element; }}
                                role="menuitem"
                                href={action.href}
                                onClick={() => close()}
                                className={cn(
                                    'group flex rounded-xl border outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-400',
                                    action.primary
                                        ? 'mb-3 items-center gap-4 border-indigo-500/30 bg-indigo-500/10 p-4 hover:border-indigo-400/60 hover:bg-indigo-500/15'
                                        : 'mb-2 items-start gap-3 border-slate-800 bg-slate-950/60 p-3 last:mb-0 hover:border-slate-700 hover:bg-slate-800/70'
                                )}
                            >
                                <span className={cn('flex shrink-0 items-center justify-center rounded-lg', action.primary ? 'h-11 w-11 bg-indigo-500 text-white' : 'h-9 w-9 bg-slate-800 text-indigo-300')}>
                                    <Icon className={action.primary ? 'h-6 w-6' : 'h-4 w-4'} />
                                </span>
                                <span>
                                    <span className={cn('block font-semibold text-white', action.primary && 'text-base')}>{action.label}</span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-400">{action.description}</span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
