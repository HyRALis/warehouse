export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const validateProductImage = (file: File): string | null => {
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) return 'Image must be 2 MB or smaller.';
    return null;
};
