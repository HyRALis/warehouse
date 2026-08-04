export interface RegisterVendorRequest {
  email: string;
  passwordHash?: string; // Often hashed before this point or sent as plain password
  password?: string;
  companyName: string;
}

export interface LoginVendorRequest {
  email: string;
  password?: string;
}

export interface VendorResponse {
  id: string;
  email: string;
  companyName: string;
  createdAt: Date | string;
}

export interface AuthResponse {
  token: string;
  vendor: VendorResponse;
}
