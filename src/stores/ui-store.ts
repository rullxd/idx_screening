import { create } from 'zustand'

interface UIState {
    // Broker subpage navigation
    currentBrokerSubpage: 'brokerlist' | 'marketdetector'

    // Modals & Drawers
    showStockDetail: boolean
    selectedStockCode: string | null

    // UI State
    sidebarOpen: boolean
    mobileMenuOpen: boolean
    loadingOverlay: boolean

    // Actions
    setCurrentBrokerSubpage: (subpage: UIState['currentBrokerSubpage']) => void
    showStockDetailModal: (code: string) => void
    hideStockDetailModal: () => void
    setSidebarOpen: (open: boolean) => void
    setMobileMenuOpen: (open: boolean) => void
    setLoadingOverlay: (loading: boolean) => void
}

type UIStateData = Omit<UIState, 'setCurrentBrokerSubpage' | 'showStockDetailModal' | 'hideStockDetailModal' | 'setSidebarOpen' | 'setMobileMenuOpen' | 'setLoadingOverlay'>

const initialState: UIStateData = {
    currentBrokerSubpage: 'brokerlist',
    showStockDetail: false,
    selectedStockCode: null,
    sidebarOpen: true,
    mobileMenuOpen: false,
    loadingOverlay: false,
}

export const useUIStore = create<UIState>((set) => ({
    ...initialState,

    setCurrentBrokerSubpage: (subpage) => set({ currentBrokerSubpage: subpage }),

    showStockDetailModal: (code) =>
        set({ showStockDetail: true, selectedStockCode: code }),

    hideStockDetailModal: () =>
        set({ showStockDetail: false, selectedStockCode: null }),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

    setLoadingOverlay: (loading) => set({ loadingOverlay: loading }),
}))