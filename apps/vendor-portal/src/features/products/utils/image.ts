export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/webp'] as const;

export const validateProductImage = (file: File): string | null => {
    if (!PRODUCT_IMAGE_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_TYPES)[number])) return 'Choose a JPEG or WebP image.';
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) return 'Image must be 2 MB or smaller.';
    return null;
};
