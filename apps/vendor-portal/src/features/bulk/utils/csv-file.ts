export const validateCsvFile = (file: Pick<File, 'name' | 'size'>): string | null => {
    if (!file.name.toLowerCase().endsWith('.csv')) return 'Choose a CSV file.';
    if (file.size > 5 * 1024 * 1024) return 'CSV files must be 5 MB or smaller.';
    if (file.size === 0) return 'The CSV file is empty.';
    return null;
};
