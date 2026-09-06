'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, DownloadCloud, FileSpreadsheet, UploadCloud } from 'lucide-react';
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    PageHeader,
    Spinner,
} from '@inventory-system/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useExportProducts, useImportProducts } from '../hooks';
import { validateCsvFile } from '../utils/csv-file';

export const BulkOperationsView = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const importProducts = useImportProducts();
    const exportProducts = useExportProducts();
    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader title="Bulk Operations" description="Import and export products via CSV" />
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                                <UploadCloud className="h-5 w-5" />
                            </div>
                            <CardTitle>Import Products</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <label className="group relative block rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-8 text-center focus-within:ring-2 focus-within:ring-indigo-500">
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                aria-label="Choose CSV file"
                                ref={inputRef}
                                disabled={importProducts.isPending}
                                onChange={(event) => {
                                    const selected = event.target.files?.[0] ?? null;
                                    const error = selected ? validateCsvFile(selected) : null;
                                    setFileError(error);
                                    setFile(error ? null : selected);
                                    importProducts.reset();
                                }}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                            {file ? (
                                <span className="font-medium text-emerald-400">{file.name}</span>
                            ) : (
                                <>
                                    <span className="block font-medium text-slate-300">
                                        Choose a CSV file
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        Maximum file size 5 MB
                                    </span>
                                </>
                            )}
                        </label>
                        <Button
                            className="mt-4 w-full"
                            disabled={!file || importProducts.isPending}
                            onClick={() => file && importProducts.mutate(file, { onSuccess: () => {
                                setFile(null);
                                if (inputRef.current) inputRef.current.value = '';
                            } })}
                        >
                            {importProducts.isPending && <Spinner size={5} className="mr-2" />}Start
                            Import
                        </Button>
                        {fileError && <Alert variant="danger" className="mt-4">{fileError}</Alert>}
                        {importProducts.error && (
                            <Alert variant="danger" className="mt-4">
                                {getErrorMessage(importProducts.error)}
                            </Alert>
                        )}
                        {importProducts.data && (
                            <Alert
                                variant={
                                    importProducts.data.data.errors.length ? 'warning' : 'success'
                                }
                                className="mt-4"
                            >
                                <div className="flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Import completed
                                </div>
                                <p className="mt-2">
                                    Imported: {importProducts.data.data.imported} (
                                    {importProducts.data.data.importedProducts} products,{' '}
                                    {importProducts.data.data.importedVersions} versions) · Failed
                                    rows: {importProducts.data.data.failedRows}
                                </p>
                                {importProducts.data.data.failedRows > 0 && <p>Correct the failed rows and upload only those rows to avoid importing successful rows again.</p>}
                                {importProducts.data.data.errors.length > 0 && (
                                    <ul className="mt-2 list-disc pl-5">
                                        {importProducts.data.data.errors.map((error) => (
                                            <li key={`${error.row}-${error.code}-${error.field ?? ''}`}>
                                                Row {error.row}: {error.message}
                                                {error.field ? ` (${error.field})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-400">
                                <DownloadCloud className="h-5 w-5" />
                            </div>
                            <CardTitle>Export Products</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-6 text-sm text-slate-400">
                            Download your entire product catalog with details, SKUs, and
                            characteristics.
                        </p>
                        <Button
                            variant="secondary"
                            className="w-full"
                            disabled={exportProducts.isPending}
                            onClick={() => exportProducts.mutate()}
                        >
                            {exportProducts.isPending ? (
                                <Spinner size={5} className="mr-2" />
                            ) : (
                                <DownloadCloud className="mr-2 h-5 w-5" />
                            )}
                            Export All Products
                        </Button>
                        {exportProducts.error && (
                            <Alert variant="danger" className="mt-4">
                                {getErrorMessage(exportProducts.error)}
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
