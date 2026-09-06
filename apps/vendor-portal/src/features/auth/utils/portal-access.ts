import type { VendorPlatformContext } from '@inventory-system/contracts';

/**
 * Portal access needs three separate facts to hold: the organization is subscribed, the
 * membership is granted access, and a primary Vendor Profile exists. Each failure has its own
 * remedy, so the reason is reported rather than collapsed into a single boolean.
 */
export const portalAccessDenial = (context: VendorPlatformContext | null): string | null => {
    if (!context) return 'The Vendor Portal entitlement could not be read.';
    if (context.portal.subscription?.active !== true) {
        return 'Your organization does not currently have an active Vendor Portal subscription.';
    }
    if (!context.portal.access.granted) {
        return 'Your membership has not been granted Vendor Portal access.';
    }
    if (!context.vendorProfile) return 'The primary Vendor Profile is not available.';
    return null;
};
