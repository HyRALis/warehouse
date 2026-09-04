'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../utils/cn';

export interface FileDropzoneProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    label: string;
    description?: string;
    preview?: React.ReactNode;
    onFileChange: (file: File | null) => void;
}

export const FileDropzone = ({ label, description, preview, onFileChange, className, id = 'file-upload', ...props }: FileDropzoneProps) => (
    <label htmlFor={id} className={cn('group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-800 bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-500', className)}>
        {preview ?? <span className="flex flex-col items-center p-6 text-center text-slate-400"><UploadCloud className="mb-3 h-10 w-10 text-slate-500" /><span className="mb-1 text-sm font-medium text-slate-200">{label}</span>{description && <span className="text-xs">{description}</span>}</span>}
        <input id={id} type="file" aria-label={label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} {...props} />
    </label>
);
