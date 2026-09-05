import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface PaginationProps {
    page: number;
    totalPages: number;
    totalItems?: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
}

export const Pagination = ({
    page,
    totalPages,
    totalItems,
    pageSize = 12,
    onPageChange,
}: PaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-between border-t border-slate-800 pt-6"
        >
            <div className="text-sm text-slate-400">
                {totalItems === undefined
                    ? `Page ${page} of ${totalPages}`
                    : `Showing ${Math.min((page - 1) * pageSize + 1, totalItems)}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="px-3 text-sm font-medium text-slate-300">
                    Page {page} of {totalPages}
                </span>
                <Button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </nav>
    );
};
