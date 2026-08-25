'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { AuthResponse } from '@inventory-system/shared-types';

interface Vendor {
    id: string;
    email: string;
    companyName: string;
    createdAt: string;
}

interface AuthContextType {
    vendor: Vendor | null;
    loading: boolean;
    login: (data: AuthResponse) => void;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    vendor: null,
    loading: true,
    login: () => {},
    logout: async () => {},
    refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const refreshProfile = async () => {
        try {
            const res = await api.getMe();
            if (res.success && res.data) {
                setVendor(res.data);
            } else {
                setVendor(null);
            }
        } catch {
            setVendor(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, []);

    const login = (data: AuthResponse) => {
        setVendor(data.vendor as Vendor);
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (e) {
            console.error(e);
        } finally {
            setVendor(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ vendor, loading, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
