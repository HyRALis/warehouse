import { Filter, Search } from 'lucide-react';
import { Input, Select } from '@inventory-system/ui';
import type { ProductStatus } from '@inventory-system/contracts';

export const ProductFilters = ({ search, status, onSearchChange, onStatusChange }: { search: string; status: ProductStatus | null; onSearchChange: (value: string) => void; onStatusChange: (value: ProductStatus | null) => void; }) => (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><Input aria-label="Search products" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by name or SKU…" className="pl-10" /></div>
        <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-slate-500" /><Select aria-label="Filter by status" value={status ?? ''} onChange={(event) => onStatusChange((event.target.value || null) as ProductStatus | null)}>
            <option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="DISCONTINUED">Discontinued</option>
        </Select></div>
    </div>
);
