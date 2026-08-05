'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '@/lib/api';

interface Vendor {
    id: string;
    email: string;
    companyName: string;
    createdAt: string;
}

interface AuthContextType {
    vendor: Vendor | null;
    loading: boolean;
    login: (data: { token: string; vendor: Vendor }) => void;
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
        const token = getAuthToken();
        if (!token) {
            setVendor(null);
            setLoading(false);
            return;
        }

        try {
            const res = await api.getMe();
            if (res.success && res.data) {
                setVendor(res.data);
            } else {
                removeAuthToken();
                setVendor(null);
            }
        } catch {
            removeAuthToken();
            setVendor(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, []);

    const login = (data: { token: string; vendor: Vendor }) => {
        setAuthToken(data.token);
        setVendor(data.vendor);
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (e) {
            console.error(e);
        } finally {
            removeAuthToken();
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
