import type { UniversalSearchEntityType } from '@inventory-system/contracts';

export const searchFilters: Array<{ value: UniversalSearchEntityType; label: string }> = [
    { value: 'product', label: 'Products' }, { value: 'version', label: 'Versions' },
    { value: 'category', label: 'Categories' }, { value: 'template', label: 'Templates' },
];

export const parseSearchUrl = (pageValue: string | null, typesValue: string | null) => {
    const parsed = Number(pageValue);
    const page = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
    const types = searchFilters.filter(({ value }) => (typesValue || '').split(',').includes(value))
        .map(({ value }) => value).join(',');
    return { page, types };
};
