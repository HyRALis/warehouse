'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { VendorPlatformContext } from '@inventory-system/shared-types';
import { api, ApiError } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    twoFactorEnabled?: boolean | null;
}

export interface AuthOrganization {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
}

interface LoginResult {
    twoFactorRequired: boolean;
    twoFactorMethods?: string[];
}

interface AuthContextType {
    user: AuthUser | null;
    platform: VendorPlatformContext | null;
    organizations: AuthOrganization[];
    loading: boolean;
    accessError: ApiError | null;
    login: (email: string, password: string) => Promise<LoginResult>;
    register: (email: string, password: string, companyName: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    switchOrganization: (organizationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [platform, setPlatform] = useState<VendorPlatformContext | null>(null);
    const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState<ApiError | null>(null);

    const clear = useCallback(() => {
        setUser(null);
        setPlatform(null);
        setOrganizations([]);
        setAccessError(null);
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setAccessError(null);
        try {
            const sessionResult = await authClient.getSession();
            if (!sessionResult.data?.user) {
                clear();
                return;
            }

            setUser(sessionResult.data.user as AuthUser);
            const [organizationResult, platformResult] = await Promise.all([
                authClient.organization.list(),
                api.getPlatformContext(),
            ]);
            setOrganizations((organizationResult.data ?? []) as AuthOrganization[]);
            setPlatform(platformResult.data);
        } catch (error) {
            if (error instanceof ApiError && error.statusCode !== 401) {
                setAccessError(error);
            } else {
                clear();
            }
        } finally {
            setLoading(false);
        }
    }, [clear]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const login = useCallback(
        async (email: string, password: string): Promise<LoginResult> => {
            const response = await api.login({ email, password });
            const data = response.data as unknown as {
                twoFactorRequired?: boolean;
                twoFactorMethods?: string[];
            };
            if (data.twoFactorRequired) {
                return { twoFactorRequired: true, twoFactorMethods: data.twoFactorMethods };
            }
            await refresh();
            return { twoFactorRequired: false };
        },
        [refresh]
    );

    const register = useCallback(
        async (email: string, password: string, companyName: string): Promise<void> => {
            await api.register({ email, password, companyName });
            await refresh();
        },
        [refresh]
    );

    const logout = useCallback(async () => {
        try {
            await authClient.signOut();
        } finally {
            clear();
        }
    }, [clear]);

    const switchOrganization = useCallback(
        async (organizationId: string) => {
            const result = await authClient.organization.setActive({ organizationId });
            if (result.error) throw new Error(result.error.message || 'Organization switch failed');
            await refresh();
        },
        [refresh]
    );

    const value = useMemo<AuthContextType>(
        () => ({
            user,
            platform,
            organizations,
            loading,
            accessError,
            login,
            register,
            logout,
            refresh,
            refreshProfile: refresh,
            switchOrganization,
        }),
        [
            user,
            platform,
            organizations,
            loading,
            accessError,
            login,
            register,
            logout,
            refresh,
            switchOrganization,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
};
