'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowRightLeft,
    Copy,
    GitBranch,
    ImagePlus,
    Plus,
    RefreshCw,
    Save,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { Badge, Button, Input, Label, Spinner } from '@inventory-system/ui';
import {
    ProductStatus,
    type ProductVersionComparisonResponse,
} from '@inventory-system/shared-types';
import { api } from '@/lib/api';

interface Characteristic {
    name: string;
    value: string;
    measurement?: string;
}

export interface ManagedProductVersion {
    id: string;
    versionNumber: number;
    label: string;
    sku: string;
    barcode?: string | null;
    qrCodeUrl?: string | null;
    status: ProductStatus;
    effectiveStatus?: ProductStatus;
    characteristics: Characteristic[];
    designNotes?: string | null;
    isPrimary: boolean;
    canDelete?: boolean;
    images?: Array<{ id: string; imageUrl: string; sortOrder: number }>;
}

interface ProductVersionManagerProps {
    productId: string;
    productStatus: ProductStatus;
    versions: ManagedProductVersion[];
    onChanged: () => Promise<void> | void;
}

interface VersionDraft {
    label: string;
    sku: string;
    barcode: string;
    status: ProductStatus;
    designNotes: string;
    characteristics: Characteristic[];
}

const badgeVariant = (status: ProductStatus): 'success' | 'warning' | 'danger' | 'default' =>
    status === ProductStatus.ACTIVE
        ? 'success'
        : status === ProductStatus.DRAFT
          ? 'warning'
          : 'danger';

const calculateEffectiveStatus = (
    productStatus: ProductStatus,
    versionStatus: ProductStatus
): ProductStatus => {
    if (
        productStatus === ProductStatus.DISCONTINUED ||
        versionStatus === ProductStatus.DISCONTINUED
    ) {
        return ProductStatus.DISCONTINUED;
    }
    return productStatus === ProductStatus.ACTIVE && versionStatus === ProductStatus.ACTIVE
        ? ProductStatus.ACTIVE
        : ProductStatus.DRAFT;
};

const emptyCharacteristic = (): Characteristic => ({ name: '', value: '', measurement: '' });

const CharacteristicFields = ({
    value,
    onChange,
}: {
    value: Characteristic[];
    onChange: (value: Characteristic[]) => void;
}) => (
    <div className="space-y-3">
        {value.map((characteristic, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
                <Input
                    aria-label={`Characteristic ${index + 1} name`}
                    value={characteristic.name}
                    onChange={(event) => {
                        const next = [...value];
                        next[index] = { ...next[index], name: event.target.value };
                        onChange(next);
                    }}
                    placeholder="Name"
                    className="col-span-4"
                />
                <Input
                    aria-label={`Characteristic ${index + 1} value`}
                    value={characteristic.value}
                    onChange={(event) => {
                        const next = [...value];
                        next[index] = { ...next[index], value: event.target.value };
                        onChange(next);
                    }}
                    placeholder="Value"
                    className="col-span-5"
                />
                <Input
                    aria-label={`Characteristic ${index + 1} unit`}
                    value={characteristic.measurement || ''}
                    onChange={(event) => {
                        const next = [...value];
                        next[index] = { ...next[index], measurement: event.target.value };
                        onChange(next);
                    }}
                    placeholder="Unit"
                    className="col-span-2"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove characteristic ${index + 1}`}
                    onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                    className="col-span-1 text-rose-400"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        ))}
        <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => onChange([...value, emptyCharacteristic()])}
        >
            <Plus className="mr-2 h-4 w-4" /> Add characteristic
        </Button>
    </div>
);

export default function ProductVersionManager({
    productId,
    productStatus,
    versions,
    onChanged,
}: ProductVersionManagerProps) {
    const [createOpen, setCreateOpen] = useState(false);
    const [createMode, setCreateMode] = useState<'BLANK' | 'COPY'>('BLANK');
    const [sourceVersionId, setSourceVersionId] = useState(versions[0]?.id || '');
    const [createDraft, setCreateDraft] = useState<VersionDraft>({
        label: '',
        sku: '',
        barcode: '',
        status: ProductStatus.DRAFT,
        designNotes: '',
        characteristics: [],
    });
    const [copyImages, setCopyImages] = useState(true);
    const [setAsPrimary, setSetAsPrimary] = useState(false);
    const [generateQrCode, setGenerateQrCode] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<VersionDraft | null>(null);
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [comparison, setComparison] = useState<ProductVersionComparisonResponse | null>(null);
    const [busyAction, setBusyAction] = useState('');
    const [error, setError] = useState('');

    const orderedVersions = useMemo(
        () => [...versions].sort((left, right) => left.versionNumber - right.versionNumber),
        [versions]
    );

    useEffect(() => {
        if (!orderedVersions.some((version) => version.id === sourceVersionId)) {
            setSourceVersionId(orderedVersions[0]?.id || '');
        }
    }, [orderedVersions, sourceVersionId]);

    const runAction = async (key: string, action: () => Promise<void>) => {
        setBusyAction(key);
        setError('');
        try {
            await action();
            await onChanged();
        } catch (actionError: any) {
            setError(actionError?.message || 'Could not update this version');
        } finally {
            setBusyAction('');
        }
    };

    const createVersion = async (event: React.FormEvent) => {
        event.preventDefault();
        if (createMode === 'COPY' && !sourceVersionId) {
            setError('Choose a source version to copy.');
            return;
        }
        await runAction('create', async () => {
            await api.createProductVersion(productId, {
                label: createDraft.label,
                mode: createMode,
                sourceVersionId: createMode === 'COPY' ? sourceVersionId : undefined,
                sku: createDraft.sku.trim() || undefined,
                barcode: createDraft.barcode.trim() || undefined,
                status: createDraft.status,
                characteristics:
                    createMode === 'BLANK'
                        ? createDraft.characteristics.filter((item) => item.name)
                        : undefined,
                designNotes: createDraft.designNotes.trim() || undefined,
                copyImages: createMode === 'COPY' ? copyImages : false,
                setAsPrimary,
                generateQrCode,
            });
            setCreateOpen(false);
            setCreateDraft({
                label: '',
                sku: '',
                barcode: '',
                status: ProductStatus.DRAFT,
                designNotes: '',
                characteristics: [],
            });
        });
    };

    const beginEdit = (version: ManagedProductVersion) => {
        setEditingId(version.id);
        setEditDraft({
            label: version.label,
            sku: version.sku,
            barcode: version.barcode || '',
            status: version.status,
            designNotes: version.designNotes || '',
            characteristics: (version.characteristics || []).map((item) => ({ ...item })),
        });
    };

    const saveEdit = async () => {
        if (!editingId || !editDraft) return;
        await runAction(`edit-${editingId}`, async () => {
            await api.updateProductVersion(productId, editingId, {
                ...editDraft,
                barcode: editDraft.barcode.trim() || null,
                designNotes: editDraft.designNotes.trim() || null,
                characteristics: editDraft.characteristics.filter((item) => item.name),
            });
            setEditingId(null);
            setEditDraft(null);
        });
    };

    const updateStatus = (version: ManagedProductVersion, status: ProductStatus) =>
        runAction(`status-${version.id}`, async () => {
            await api.updateProductVersion(productId, version.id, { status });
        });

    const setPrimary = (version: ManagedProductVersion) =>
        runAction(`primary-${version.id}`, async () => {
            await api.setPrimaryProductVersion(productId, version.id);
        });

    const deleteVersion = (version: ManagedProductVersion) => {
        if (!window.confirm(`Delete version “${version.label}”? This keeps its R2 media safe.`)) {
            return;
        }
        void runAction(`delete-${version.id}`, async () => {
            await api.deleteProductVersion(productId, version.id);
            setCompareIds((current) => current.filter((id) => id !== version.id));
        });
    };

    const uploadImage = async (version: ManagedProductVersion, file?: File) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Choose a JPEG, PNG, or WebP image.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be 2 MB or smaller.');
            return;
        }
        const formData = new FormData();
        formData.append('image', file);
        await runAction(`image-${version.id}`, async () => {
            await api.uploadProductVersionImage(productId, version.id, formData);
        });
    };

    const removeImage = (imageId: string) =>
        runAction(`image-delete-${imageId}`, async () => {
            await api.deleteProductImage(productId, imageId);
        });

    const toggleComparison = (versionId: string) => {
        setComparison(null);
        setCompareIds((current) => {
            if (current.includes(versionId)) return current.filter((id) => id !== versionId);
            return [...current.slice(-1), versionId];
        });
    };

    const compareVersions = () =>
        runAction('compare', async () => {
            const response = await api.compareProductVersions(
                productId,
                compareIds[0],
                compareIds[1]
            );
            setComparison(response.data);
        });

    return (
        <section className="space-y-5" aria-labelledby="versions-heading">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 id="versions-heading" className="text-xl font-semibold text-white">
                        Product versions
                    </h2>
                    <p className="text-sm text-slate-400">
                        A version is sellable only when both it and the product are Active.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={compareIds.length !== 2 || busyAction === 'compare'}
                        onClick={() => void compareVersions()}
                    >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Compare ({compareIds.length}/2)
                    </Button>
                    <Button onClick={() => setCreateOpen((open) => !open)}>
                        {createOpen ? (
                            <X className="mr-2 h-4 w-4" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        {createOpen ? 'Close' : 'Add version'}
                    </Button>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"
                >
                    {error}
                </div>
            )}

            {createOpen && (
                <form
                    onSubmit={createVersion}
                    className="space-y-5 rounded-xl border border-indigo-500/30 bg-slate-900 p-5"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setCreateMode('BLANK')}
                            className={`rounded-xl border p-4 text-left ${createMode === 'BLANK' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950'}`}
                        >
                            <GitBranch className="mb-2 h-5 w-5 text-indigo-400" />
                            <span className="block font-medium text-white">Start blank</span>
                            <span className="text-xs text-slate-400">
                                Create an independent design.
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreateMode('COPY')}
                            className={`rounded-xl border p-4 text-left ${createMode === 'COPY' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950'}`}
                        >
                            <Copy className="mb-2 h-5 w-5 text-indigo-400" />
                            <span className="block font-medium text-white">Copy existing</span>
                            <span className="text-xs text-slate-400">
                                Reuse details and media references.
                            </span>
                        </button>
                    </div>

                    {createMode === 'COPY' && (
                        <div className="space-y-1.5">
                            <Label>Source version</Label>
                            <select
                                aria-label="Source version"
                                value={sourceVersionId}
                                onChange={(event) => setSourceVersionId(event.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white"
                            >
                                {orderedVersions.map((version) => (
                                    <option key={version.id} value={version.id}>
                                        v{version.versionNumber} · {version.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>Version label *</Label>
                            <Input
                                required
                                value={createDraft.label}
                                onChange={(event) =>
                                    setCreateDraft({ ...createDraft, label: event.target.value })
                                }
                                placeholder="e.g. Summer 2027"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>SKU (Optional)</Label>
                            <Input
                                value={createDraft.sku}
                                onChange={(event) =>
                                    setCreateDraft({ ...createDraft, sku: event.target.value })
                                }
                                placeholder="Leave blank to generate"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Barcode (Optional)</Label>
                            <Input
                                value={createDraft.barcode}
                                onChange={(event) =>
                                    setCreateDraft({ ...createDraft, barcode: event.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Status</Label>
                            <select
                                aria-label="New version status"
                                value={createDraft.status}
                                onChange={(event) =>
                                    setCreateDraft({
                                        ...createDraft,
                                        status: event.target.value as ProductStatus,
                                    })
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white"
                            >
                                {Object.values(ProductStatus).map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Design notes</Label>
                        <textarea
                            value={createDraft.designNotes}
                            onChange={(event) =>
                                setCreateDraft({ ...createDraft, designNotes: event.target.value })
                            }
                            rows={3}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white"
                        />
                    </div>
                    {createMode === 'BLANK' && (
                        <CharacteristicFields
                            value={createDraft.characteristics}
                            onChange={(characteristics) =>
                                setCreateDraft({ ...createDraft, characteristics })
                            }
                        />
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        {createMode === 'COPY' && (
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={copyImages}
                                    onChange={(event) => setCopyImages(event.target.checked)}
                                />{' '}
                                Reuse image references
                            </label>
                        )}
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={generateQrCode}
                                onChange={(event) => setGenerateQrCode(event.target.checked)}
                            />{' '}
                            Generate QR code
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={setAsPrimary}
                                onChange={(event) => setSetAsPrimary(event.target.checked)}
                            />{' '}
                            Set as primary
                        </label>
                    </div>
                    <Button type="submit" disabled={busyAction === 'create'}>
                        {busyAction === 'create' ? (
                            <Spinner className="mr-2" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}{' '}
                        Create version
                    </Button>
                </form>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {orderedVersions.map((version) => {
                    const effective =
                        version.effectiveStatus ||
                        calculateEffectiveStatus(productStatus, version.status);
                    const image = version.images?.[0];
                    return (
                        <article
                            key={version.id}
                            className={`rounded-xl border bg-slate-900 p-5 ${version.isPrimary ? 'border-indigo-500/50' : 'border-slate-800'}`}
                        >
                            <div className="flex gap-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                                    {image ? (
                                        <img
                                            src={image.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="h-7 w-7 text-slate-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            v{version.versionNumber}
                                        </span>
                                        <h3 className="font-semibold text-white">
                                            {version.label}
                                        </h3>
                                        {version.isPrimary && (
                                            <Badge>
                                                <Star className="mr-1 h-3 w-3" /> Primary
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                                        {version.sku}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant={badgeVariant(version.status)}>
                                            Version: {version.status}
                                        </Badge>
                                        <Badge variant={badgeVariant(effective)}>
                                            Effective: {effective}
                                        </Badge>
                                    </div>
                                </div>
                                <label className="flex items-start gap-2 text-xs text-slate-400">
                                    <input
                                        type="checkbox"
                                        aria-label={`Compare ${version.label}`}
                                        checked={compareIds.includes(version.id)}
                                        onChange={() => toggleComparison(version.id)}
                                    />{' '}
                                    Compare
                                </label>
                            </div>

                            {(version.barcode || version.designNotes || version.qrCodeUrl) && (
                                <div className="mt-4 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-[1fr_auto]">
                                    <div className="space-y-2 text-sm">
                                        {version.barcode && (
                                            <p>
                                                <span className="text-slate-500">Barcode:</span>{' '}
                                                <span className="font-mono text-slate-300">
                                                    {version.barcode}
                                                </span>
                                            </p>
                                        )}
                                        {version.designNotes && (
                                            <p className="text-slate-300">{version.designNotes}</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            {version.characteristics?.length || 0} characteristics ·{' '}
                                            {version.images?.length || 0} images
                                        </p>
                                    </div>
                                    {version.qrCodeUrl && (
                                        <img
                                            src={version.qrCodeUrl}
                                            alt={`${version.label} QR code`}
                                            className="h-16 w-16 rounded bg-white p-1"
                                        />
                                    )}
                                </div>
                            )}

                            {editingId === version.id && editDraft ? (
                                <div className="mt-5 space-y-4 border-t border-slate-800 pt-5">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Input
                                            aria-label="Version label"
                                            value={editDraft.label}
                                            onChange={(event) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    label: event.target.value,
                                                })
                                            }
                                        />
                                        <Input
                                            aria-label="Version SKU"
                                            value={editDraft.sku}
                                            onChange={(event) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    sku: event.target.value,
                                                })
                                            }
                                        />
                                        <Input
                                            aria-label="Version barcode"
                                            value={editDraft.barcode}
                                            onChange={(event) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    barcode: event.target.value,
                                                })
                                            }
                                            placeholder="Barcode"
                                        />
                                        <select
                                            aria-label="Version status"
                                            value={editDraft.status}
                                            onChange={(event) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    status: event.target.value as ProductStatus,
                                                })
                                            }
                                            className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white"
                                        >
                                            {Object.values(ProductStatus).map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        aria-label="Version design notes"
                                        value={editDraft.designNotes}
                                        onChange={(event) =>
                                            setEditDraft({
                                                ...editDraft,
                                                designNotes: event.target.value,
                                            })
                                        }
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-white"
                                    />
                                    {version.images && version.images.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {version.images.map((image) => (
                                                <div
                                                    key={image.id}
                                                    className="relative aspect-square overflow-hidden rounded-lg border border-slate-800"
                                                >
                                                    <img
                                                        src={image.imageUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Delete image from ${version.label}`}
                                                        onClick={() => void removeImage(image.id)}
                                                        className="absolute right-1 top-1 rounded bg-slate-950/90 p-1 text-rose-400"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <CharacteristicFields
                                        value={editDraft.characteristics}
                                        onChange={(characteristics) =>
                                            setEditDraft({ ...editDraft, characteristics })
                                        }
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => void saveEdit()}
                                            disabled={busyAction === `edit-${version.id}`}
                                        >
                                            <Save className="mr-2 h-4 w-4" /> Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditingId(null);
                                                setEditDraft(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => beginEdit(version)}
                                    >
                                        Edit
                                    </Button>
                                    {!version.isPrimary && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => void setPrimary(version)}
                                            disabled={busyAction === `primary-${version.id}`}
                                        >
                                            <Star className="mr-2 h-4 w-4" /> Set primary
                                        </Button>
                                    )}
                                    {version.status === ProductStatus.DISCONTINUED ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                void updateStatus(version, ProductStatus.ACTIVE)
                                            }
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" /> Reactivate
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                void updateStatus(
                                                    version,
                                                    ProductStatus.DISCONTINUED
                                                )
                                            }
                                        >
                                            Discontinue
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            void runAction(`qr-${version.id}`, async () => {
                                                await api.updateProductVersion(
                                                    productId,
                                                    version.id,
                                                    { generateQrCode: true }
                                                );
                                            })
                                        }
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" /> QR
                                    </Button>
                                    <label className="inline-flex cursor-pointer items-center rounded-lg px-3 text-sm text-slate-300 hover:bg-slate-800">
                                        <ImagePlus className="mr-2 h-4 w-4" /> Add image
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="sr-only"
                                            onChange={(event) =>
                                                void uploadImage(version, event.target.files?.[0])
                                            }
                                        />
                                    </label>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={!version.canDelete}
                                        title={
                                            version.isPrimary
                                                ? 'Set another version as primary first'
                                                : undefined
                                        }
                                        onClick={() => deleteVersion(version)}
                                        className="text-rose-400"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            {comparison && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Version comparison</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Close comparison"
                            onClick={() => setComparison(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {comparison.differences.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            These versions have the same sellable details.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">Field</th>
                                        <th className="px-4 py-3">{comparison.left.label}</th>
                                        <th className="px-4 py-3">{comparison.right.label}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {comparison.differences.map((difference: any) => (
                                        <tr key={difference.field}>
                                            <td className="px-4 py-3 font-medium text-slate-200">
                                                {difference.field}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {typeof difference.left === 'object'
                                                    ? JSON.stringify(difference.left)
                                                    : String(difference.left ?? '—')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {typeof difference.right === 'object'
                                                    ? JSON.stringify(difference.right)
                                                    : String(difference.right ?? '—')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
