'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
    UploadCloud,
    DownloadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Info,
} from 'lucide-react';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent } from '@inventory-system/ui';
import type { CsvImportResult } from '@inventory-system/shared-types';

interface ImportResponse {
    success: boolean;
    message?: string;
    data?: CsvImportResult;
}

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const sampleCsv = [
    'productReference,productName,categoryCode,categoryName,productStatus,versionLabel,versionStatus,sku,barcode,characteristics,designNotes,isPrimary',
    'creator-hoodie,Creator Hoodie,creator-merchandise,,DRAFT,Black,DRAFT,HOODIE-BLK-001,123456789012,"[]",Launch color,true',
    'creator-hoodie,Creator Hoodie,creator-merchandise,,DRAFT,White,DRAFT,HOODIE-WHT-001,123456789013,"[]",Secondary color,false',
].join('\n');

const downloadText = (content: string, fileName: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export default function BulkOperationsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [result, setResult] = useState<ImportResponse | null>(null);
    const [exportError, setExportError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clearFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const selectFile = (nextFile: File | null) => {
        setResult(null);
        if (nextFile && !nextFile.name.toLocaleLowerCase().endsWith('.csv')) {
            clearFile();
            setResult({ success: false, message: 'Choose a file with the .csv extension.' });
            return;
        }
        if (nextFile && nextFile.size > MAX_CSV_BYTES) {
            clearFile();
            setResult({ success: false, message: 'CSV files must be 5 MB or smaller.' });
            return;
        }
        setFile(nextFile);
    };

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = (await api.importCSV(formData)) as ImportResponse;
            setResult(res);
            if (res.success) clearFile();
        } catch (error) {
            setResult({
                success: false,
                message: error instanceof Error ? error.message : 'Import failed',
            });
        } finally {
            setImporting(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        setExportError('');
        try {
            const blob = await api.exportCSV();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'product-versions.csv';
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const downloadErrors = () => {
        if (!result?.data?.errors.length) return;
        const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = result.data.errors.map((error) => [error.row, error.code, error.field || '', error.value || '', error.message].map(escape).join(','));
        downloadText(['row,code,field,value,message', ...rows].join('\n'), 'product-import-errors.csv');
    };

    const hasRowErrors = Boolean(result?.data?.failedRows);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Product CSV</h1>
                <p className="mt-1 text-sm text-slate-400">Import and export products with all primary and secondary versions.</p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" /><p>Use one row per version. Reuse <strong className="text-white">productReference</strong> to group versions, and identify categories with <strong className="text-white">categoryCode</strong> whenever possible.</p></div>
                <Button variant="outline" className="shrink-0" onClick={() => downloadText(sampleCsv, 'product-versions-template.csv')}><DownloadCloud className="mr-2 h-4 w-4" /> Download template</Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Import Section */}
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
                        <div className="group relative rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-8 text-center transition-colors hover:border-indigo-500/50">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                aria-label="Choose product CSV"
                                disabled={importing}
                                onChange={(e) => selectFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            />
                            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-slate-600 transition-colors group-hover:text-indigo-400" />
                            {file ? (
                                <div><div className="font-medium text-emerald-400">{file.name}</div><div className="mt-1 text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB selected</div></div>
                            ) : (
                                <>
                                    <p className="mb-1 font-medium text-slate-300">
                                        Click or drag CSV file here
                                    </p>
                                    <p className="text-sm text-slate-500">Maximum file size 5MB</p>
                                </>
                            )}
                        </div>

                        {file && !importing && (
                            <div className="mt-2 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={clearFile}>
                                    Remove selected file
                                </Button>
                            </div>
                        )}

                        <Button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="mt-4 w-full"
                        >
                            {importing ? <Spinner size={5} className="mr-2" /> : 'Start Import'}
                        </Button>

                        {result && (
                            <div
                                role={result.success ? 'status' : 'alert'}
                                className={`mt-4 rounded-lg border p-4 ${!result.success ? 'border-rose-500/20 bg-rose-500/10' : hasRowErrors ? 'border-amber-500/20 bg-amber-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    {result.success && !hasRowErrors ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className={`h-5 w-5 ${hasRowErrors ? 'text-amber-500' : 'text-rose-500'}`} />
                                    )}
                                    <span
                                        className={`font-medium ${!result.success ? 'text-rose-400' : hasRowErrors ? 'text-amber-300' : 'text-emerald-400'}`}
                                    >
                                        {result.message ||
                                            (result.success ? 'Import completed' : 'Import failed')}
                                    </span>
                                </div>
                                {result.data && (
                                    <div className="space-y-3 text-sm text-slate-300">
                                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/40 p-3 text-center"><div><strong className="block text-lg text-white">{result.data.importedProducts}</strong><span className="text-xs text-slate-500">products</span></div><div><strong className="block text-lg text-white">{result.data.importedVersions}</strong><span className="text-xs text-slate-500">versions</span></div><div><strong className="block text-lg text-white">{result.data.failedRows}</strong><span className="text-xs text-slate-500">failed rows</span></div></div>
                                        {!!result.data.errors.length && <div><div className="mb-2 flex items-center justify-between"><span className="font-medium text-slate-200">Rows to correct</span><Button variant="ghost" size="sm" onClick={downloadErrors}>Download errors</Button></div><div className="max-h-56 overflow-auto rounded-lg border border-slate-800"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-900 text-slate-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Issue</th></tr></thead><tbody>{result.data.errors.slice(0, 25).map((rowError, index) => <tr key={`${rowError.row}-${rowError.code}-${index}`} className="border-t border-slate-800"><td className="px-3 py-2 align-top font-mono text-rose-300">{rowError.row}</td><td className="px-3 py-2"><div className="font-medium text-slate-200">{rowError.message}</div><div className="mt-0.5 font-mono text-[10px] text-slate-600">{rowError.code}{rowError.field ? ` · ${rowError.field}` : ''}</div></td></tr>)}</tbody></table></div>{result.data.errors.length > 25 && <p className="mt-2 text-xs text-slate-500">Download the error file to view all {result.data.errors.length} issues.</p>}</div>}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Export Section */}
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
                        {exportError && (
                            <div role="alert" className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                                {exportError}
                            </div>
                        )}
                        <p className="mb-6 text-sm text-slate-400">
                            Download the entire catalog with category codes, separate product and version states, identifiers, design notes, characteristics, and primary-version flags.
                        </p>

                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleExport}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Spinner size={5} className="mr-2" />
                            ) : (
                                <DownloadCloud className="mr-2 h-5 w-5" />
                            )}
                            Export Products & Versions
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
