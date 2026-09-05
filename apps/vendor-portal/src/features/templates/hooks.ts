'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTemplateRequest } from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { tenantKeys } from '@/features/query-keys';
import { templatesQueryOptions } from './query-options';

export const useTemplates = () => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...templatesQueryOptions(browserApi, vendor?.id || 'pending'),
        enabled: Boolean(vendor),
    });
};

export const useCreateTemplate = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: CreateTemplateRequest) => browserApi.templates.create(body),
        onSuccess: async () => {
            if (!vendor) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.templates(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
            notify({ title: 'Template created', variant: 'success' });
        },
    });
};

export const useDeleteTemplate = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: browserApi.templates.remove,
        onSuccess: async () => {
            if (!vendor) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.templates(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
            notify({ title: 'Template deleted', variant: 'success' });
        },
    });
};
