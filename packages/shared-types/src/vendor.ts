export interface RegisterVendorRequest {
    email: string;
    password: string;
    companyName: string;
}

export interface LoginVendorRequest {
    email: string;
    password: string;
}

export interface VendorResponse {
    id: string;
    email: string;
    companyName: string;
    createdAt: Date | string;
}

export interface AuthResponse {
    vendor: VendorResponse;
}
