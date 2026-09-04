'use client';

import * as React from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
    mobileNavigationOpen: boolean;
    sidebarCollapsed: boolean;
    setMobileNavigationOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

type UiStore = StoreApi<UiState> & { persist: { rehydrate: () => Promise<void> | void } };

const createUiStore = (): UiStore =>
    createStore<UiState>()(
        persist(
            (set) => ({
                mobileNavigationOpen: false,
                sidebarCollapsed: false,
                setMobileNavigationOpen: (open) => set({ mobileNavigationOpen: open }),
                toggleSidebar: () =>
                    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            }),
            {
                name: 'omnistock-ui-preferences-v1',
                skipHydration: true,
                partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }) as UiState,
            }
        )
    ) as UiStore;

const UiStoreContext = React.createContext<UiStore | null>(null);

export const UiStoreProvider = ({ children }: { children: React.ReactNode }) => {
    const [store] = React.useState(createUiStore);

    React.useEffect(() => {
        void store.persist.rehydrate();
    }, [store]);

    return <UiStoreContext.Provider value={store}>{children}</UiStoreContext.Provider>;
};

export const useUiStore = <T,>(selector: (state: UiState) => T): T => {
    const store = React.useContext(UiStoreContext);
    if (!store) throw new Error('useUiStore must be used within UiStoreProvider');
    return useStore(store, selector);
};
