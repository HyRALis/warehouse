'use client';

import * as React from 'react';
import { createFormHook, createFormHookContexts, useStore } from '@tanstack/react-form';
import { Button, Input, Label, Select, Spinner } from '@inventory-system/ui';

const { fieldContext, formContext, useFieldContext, useFormContext } =
    createFormHookContexts();

const errorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message;
    }
    return 'Invalid value';
};

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
    label: string;
    description?: string;
    leading?: React.ReactNode;
    serverError?: string;
}

const TextField = ({ label, description, leading, serverError, id, className, ...props }: TextFieldProps) => {
    const field = useFieldContext<string>();
    const fieldId = id || field.name;
    const errors = field.state.meta.isTouched ? field.state.meta.errors : [];
    const visibleErrors = serverError ? [...errors, serverError] : errors;
    const errorId = visibleErrors.length ? fieldId + '-error' : undefined;

    return (
        <div className="space-y-1.5">
            <Label htmlFor={fieldId}>{label}</Label>
            <div className="relative">
                {leading && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        {leading}
                    </div>
                )}
                <Input
                    id={fieldId}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={visibleErrors.length > 0}
                    aria-describedby={errorId || (description ? fieldId + '-description' : undefined)}
                    className={leading ? ['pl-10', className].filter(Boolean).join(' ') : className}
                    {...props}
                />
            </div>
            {description && !visibleErrors.length && (
                <p id={fieldId + '-description'} className="text-xs text-slate-500">
                    {description}
                </p>
            )}
            {visibleErrors.length > 0 && (
                <p id={errorId} role="alert" className="text-xs text-rose-400">
                    {visibleErrors.map(errorMessage).join(', ')}
                </p>
            )}
        </div>
    );
};

interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
    label: string;
    children: React.ReactNode;
    serverError?: string;
}

const SelectField = ({ label, children, serverError, id, ...props }: SelectFieldProps) => {
    const field = useFieldContext<string>();
    const fieldId = id || field.name;
    const errors = field.state.meta.isTouched ? field.state.meta.errors : [];
    const visibleErrors = serverError ? [...errors, serverError] : errors;
    return (
        <div className="space-y-1.5">
            <Label htmlFor={fieldId}>{label}</Label>
            <Select
                id={fieldId}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={visibleErrors.length > 0}
                aria-describedby={visibleErrors.length ? fieldId + '-error' : undefined}
                {...props}
            >
                {children}
            </Select>
            {visibleErrors.length > 0 && (
                <p id={fieldId + '-error'} role="alert" className="text-xs text-rose-400">
                    {visibleErrors.map(errorMessage).join(', ')}
                </p>
            )}
        </div>
    );
};

const SubmitButton = ({
    children,
    pendingLabel = 'Saving…',
    className,
    disabled = false,
}: {
    children: React.ReactNode;
    pendingLabel?: string;
    className?: string;
    disabled?: boolean;
}) => {
    const form = useFormContext();
    const [canSubmit, isSubmitting] = useStore(form.store, (state) => [
        state.canSubmit,
        state.isSubmitting,
    ]);
    return (
        <Button type="submit" disabled={disabled || !canSubmit || isSubmitting} className={className}>
            {isSubmitting ? (
                <>
                    <Spinner size={4} className="mr-2" />
                    {pendingLabel}
                </>
            ) : (
                children
            )}
        </Button>
    );
};

export const { useAppForm, withForm } = createFormHook({
    fieldComponents: { TextField, SelectField },
    formComponents: { SubmitButton },
    fieldContext,
    formContext,
});
