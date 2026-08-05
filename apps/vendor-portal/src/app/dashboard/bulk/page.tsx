'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
    UploadCloud,
    DownloadCloud,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent } from '@inventory-system/ui';

export default function BulkOperationsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.importCSV(formData);
            setResult(res);
        } catch (err: any) {
            setResult({ success: false, message: err.message || 'Import failed' });
        } finally {
            setImporting(false);
            setFile(null);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Bulk Operations</h1>
                <p className="mt-1 text-sm text-slate-400">Import and export products via CSV</p>
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
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            />
                            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-slate-600 transition-colors group-hover:text-indigo-400" />
                            {file ? (
                                <div className="font-medium text-emerald-400">{file.name}</div>
                            ) : (
                                <>
                                    <p className="mb-1 font-medium text-slate-300">
                                        Click or drag CSV file here
                                    </p>
                                    <p className="text-sm text-slate-500">Maximum file size 5MB</p>
                                </>
                            )}
                        </div>

                        <Button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="mt-4 w-full"
                        >
                            {importing ? <Spinner size={5} className="mr-2" /> : 'Start Import'}
                        </Button>

                        {result && (
                            <div
                                className={`mt-4 rounded-lg border p-4 ${result.success ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    {result.success ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                                    )}
                                    <span
                                        className={`font-medium ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}
                                    >
                                        {result.message ||
                                            (result.success ? 'Import completed' : 'Import failed')}
                                    </span>
                                </div>
                                {result.data && (
                                    <div className="text-sm text-slate-300">
                                        Imported: {result.data.imported || 0} | Errors:{' '}
                                        {result.data.errors?.length || 0}
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
                        <p className="mb-6 text-sm text-slate-400">
                            Download your entire product catalog as a CSV file. The file will
                            include product details, SKUs, and characteristics.
                        </p>

                        <a href={api.exportCSVUrl()} target="_blank" rel="noreferrer">
                            <Button variant="secondary" className="w-full">
                                <DownloadCloud className="mr-2 h-5 w-5" /> Export All Products
                            </Button>
                        </a>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
