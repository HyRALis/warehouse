'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { tenantKeys } from '@/features/query-keys';
import { downloadBlob } from './utils/download';

export const useImportProducts = () => {
    const vendor = useCurrentVendor().data;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => { const body = new FormData(); body.append('file', file); return browserApi.products.importCsv(body); },
        onSuccess: async () => { if (!vendor) return; await Promise.all([queryClient.invalidateQueries({ queryKey: tenantKeys.productLists(vendor.id) }), queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) })]); },
    });
};

export const useExportProducts = () => useMutation({ mutationFn: browserApi.products.exportCsv, onSuccess: (blob) => downloadBlob(blob, 'products.csv') });
