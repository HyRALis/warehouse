export type PortalSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface PortalSubscriptionContext {
    status: PortalSubscriptionStatus;
    startsAt: Date | string;
    endsAt: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    active: boolean;
}

export interface MemberPortalAccessContext {
    granted: boolean;
    implicit: boolean;
    record: {
        enabled: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
    } | null;
}

export interface VendorProfileContext {
    id: string;
    profileKey: 'primary';
    displayName: string;
    description: string | null;
    websiteUrl: string | null;
    logoUrl: string | null;
}

export interface UpdateVendorProfileRequest {
    displayName?: string;
    description?: string | null;
    websiteUrl?: string | null;
    logoUrl?: string | null;
}

export interface VendorPlatformContext {
    organization: {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
    };
    membership: {
        id: string;
        role: string;
        isOwner: boolean;
    };
    portal: {
        key: 'vendor';
        subscription: PortalSubscriptionContext | null;
        access: MemberPortalAccessContext;
    };
    vendorProfile: VendorProfileContext | null;
}

export interface VendorMemberAccessResponse {
    id: string;
    role: string;
    createdAt: Date | string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    vendorPortalAccess: MemberPortalAccessContext;
}
